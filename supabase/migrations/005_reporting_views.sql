-- 005_reporting_views.sql
-- Shared aggregate calculations. All dashboards/reports read from these views
-- so totals stay consistent everywhere.

-- ---------- per-affair financial synthesis (Synthèse par Affaire) ----------
create or replace view public.v_affair_financials
with (security_invoker = true) as
select
  a.id as affair_id,
  a.internal_ref,
  a.status,
  c.id as customer_id,
  c.company_name as customer_name,

  -- Order value: sum of purchase orders HT (order pipeline, NOT recognized revenue)
  coalesce(po.po_total_excluding_tax, 0) as order_value_excluding_tax,

  -- Recognized revenue = invoiced HT (invoices not cancelled), counted ONCE
  coalesce(inv.invoiced_excluding_tax, 0) as invoiced_revenue_excluding_tax,

  -- Collected revenue = payments against those invoices
  coalesce(coll.collected, 0) as collected_revenue,

  -- Outstanding receivables
  coalesce(inv.invoiced_including_tax, 0) - coalesce(coll.collected, 0) as outstanding_receivables,

  -- Variable costs: approved expenses HT
  coalesce(exp.variable_costs, 0) as variable_costs,

  -- Allocated fixed costs
  coalesce(alloc.allocated_fixed, 0) as allocated_fixed_costs,

  -- Totals (allocated fixed costs are NOT re-counted as expenses)
  coalesce(exp.variable_costs, 0) + coalesce(alloc.allocated_fixed, 0) as total_cost,

  coalesce(inv.invoiced_excluding_tax, 0)
    - (coalesce(exp.variable_costs, 0) + coalesce(alloc.allocated_fixed, 0)) as gross_margin,

  case
    when coalesce(inv.invoiced_excluding_tax, 0) = 0 then null
    else round(
      (coalesce(inv.invoiced_excluding_tax, 0)
        - (coalesce(exp.variable_costs, 0) + coalesce(alloc.allocated_fixed, 0)))
      / inv.invoiced_excluding_tax * 100, 2)
  end as margin_percent
from public.affairs a
join public.customers c on c.id = a.customer_id
left join (
  select p.affair_id,
         sum(p.amount_excluding_tax) as po_total_excluding_tax
    from public.purchase_orders p group by p.affair_id
) po on po.affair_id = a.id
left join (
  select i.affair_id,
         sum(i.total_excluding_tax) filter (where i.status <> 'cancelled') as invoiced_excluding_tax,
         sum(i.total_including_tax) filter (where i.status <> 'cancelled') as invoiced_including_tax
    from public.invoices i group by i.affair_id
) inv on inv.affair_id = a.id
left join (
  select i.affair_id, sum(p.amount) as collected
    from public.payments p
    join public.invoices i on i.id = p.invoice_id
   where i.status <> 'cancelled'
   group by i.affair_id
) coll on coll.affair_id = a.id
left join (
  select e.affair_id, sum(e.amount_excluding_tax) as variable_costs
    from public.expenses e
   where e.approval_status = 'approved' and e.affair_id is not null
   group by e.affair_id
) exp on exp.affair_id = a.id
left join (
  select ca.affair_id, sum(ca.allocated_amount) as allocated_fixed
    from public.cost_allocations ca group by ca.affair_id
) alloc on alloc.affair_id = a.id;

-- ---------- dashboard KPIs ----------
create or replace view public.v_dashboard_kpis
with (security_invoker = true) as
select
  (select count(*) from public.affairs where archived = false) as total_affairs,
  (select count(*) from public.affairs where archived = false and status not in ('closed', 'cancelled', 'invoiced')) as affairs_in_progress,
  (select count(*) from public.affairs where archived = false and status = 'closed') as affairs_closed,
  (select count(*) from public.affairs
    where archived = false and status not in ('closed', 'cancelled', 'invoiced')
      and planned_delivery_date is not null and planned_delivery_date < current_date) as affairs_overdue,
  (select coalesce(sum(amount_excluding_tax), 0) from public.purchase_orders po
     join public.affairs a on a.id = po.affair_id where a.archived = false) as po_revenue_excluding_tax,
  (select coalesce(sum(total_excluding_tax), 0) from public.invoices where status <> 'cancelled') as invoiced_revenue_excluding_tax,
  (select coalesce(sum(p.amount), 0) from public.payments p
     join public.invoices i on i.id = p.invoice_id where i.status <> 'cancelled') as collected_payments,
  (select coalesce(sum(total_including_tax), 0) - coalesce((select sum(p.amount) from public.payments p
       join public.invoices i on i.id = p.invoice_id where i.status <> 'cancelled'), 0)
     from public.invoices where status <> 'cancelled') as outstanding_customers,
  (select coalesce(sum(amount_excluding_tax), 0) from public.expenses where approval_status = 'approved') as variable_expenses,
  (select coalesce(sum(allocated_amount), 0) from public.cost_allocations) as allocated_fixed_costs,
  (select coalesce(sum(amount_excluding_tax), 0) from public.expenses where approval_status = 'approved')
    + (select coalesce(sum(allocated_amount), 0) from public.cost_allocations) as total_costs,
  (select count(*) from public.expenses where approval_status = 'approved' and receipt_received = false) as missing_expense_receipts,
  (select count(*) from public.tasks where status <> 'done' and planned_date is not null and planned_date < current_date) as overdue_tasks;

-- ---------- monthly revenue / expense chart data ----------
create or replace view public.v_monthly_revenue_expense
with (security_invoker = true) as
select
  month,
  max(revenue) as revenue,
  max(expenses) as expenses
from (
  select to_char(i.issue_date, 'YYYY-MM') as month,
         sum(i.total_excluding_tax) filter (where i.status <> 'cancelled') as revenue,
         null::numeric as expenses
    from public.invoices i where i.issue_date is not null group by 1
  union all
  select to_char(e.expense_date, 'YYYY-MM') as month,
         null::numeric,
         sum(e.amount_excluding_tax) filter (where e.approval_status = 'approved')
    from public.expenses e where e.expense_date is not null group by 1
) s
group by month;

-- ---------- overdue tasks ----------
create or replace view public.v_overdue_tasks
with (security_invoker = true) as
select t.*, a.internal_ref, a.id as affair_id
from public.tasks t
left join public.affairs a on a.id = t.affair_id
where t.status <> 'done' and t.planned_date is not null and t.planned_date < current_date;

-- ---------- missing documents ----------
create or replace view public.v_missing_documents
with (security_invoker = true) as
select 'expense_receipt' as kind, e.id as record_id, e.description as label, e.expense_date as document_date
from public.expenses e
where e.approval_status = 'approved' and e.receipt_received = false
union all
select 'invoice_pdf', i.id, i.invoice_number, i.issue_date
from public.invoices i
where i.status <> 'cancelled' and i.pdf_path is null;

-- ---------- supplier / customer expense & order totals ----------
create or replace view public.v_supplier_totals
with (security_invoker = true) as
select s.id as supplier_id,
       coalesce(sum(e.amount_including_tax) filter (where e.approval_status = 'approved'), 0) as total_expenses,
       coalesce(sum(ep.amount), 0) as total_paid
from public.suppliers s
left join public.expenses e on e.supplier_id = s.id
left join public.expense_payments ep on ep.expense_id = e.id
group by s.id;

create or replace view public.v_customer_totals
with (security_invoker = true) as
select c.id as customer_id,
       coalesce(po.total_orders, 0) as total_orders_excluding_tax,
       coalesce(inv.total_invoiced_including_tax, 0) as total_invoiced_including_tax,
       coalesce(coll.collected, 0) as total_collected,
       coalesce(inv.total_invoiced_including_tax, 0) - coalesce(coll.collected, 0) as outstanding
from public.customers c
left join (
  select a.customer_id, sum(po.amount_excluding_tax) as total_orders
    from public.purchase_orders po join public.affairs a on a.id = po.affair_id
   group by a.customer_id
) po on po.customer_id = c.id
left join (
  select i.customer_id, sum(i.total_including_tax) filter (where i.status <> 'cancelled') as total_invoiced_including_tax
    from public.invoices i group by i.customer_id
) inv on inv.customer_id = c.id
left join (
  select i.customer_id, sum(p.amount) as collected
    from public.payments p join public.invoices i on i.id = p.invoice_id
   where i.status <> 'cancelled' group by i.customer_id
) coll on coll.customer_id = c.id;
