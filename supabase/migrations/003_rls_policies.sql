-- 003_rls_policies.sql
-- Row Level Security. All enforcement lives here — the mobile UI never hides
-- data as a security measure; it only adjusts presentation.

-- ---------- Helper: current user's role (security definer, safe search_path) ----------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_role() = 'admin'
$$;

create or replace function public.has_financial_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_role() in ('admin', 'manager', 'accountant')
$$;

-- ---------- RLS enablement ----------
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_contacts enable row level security;
alter table public.suppliers enable row level security;
alter table public.affairs enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_payments enable row level security;
alter table public.fixed_costs enable row level security;
alter table public.cost_allocations enable row level security;
alter table public.tasks enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

-- ---------- profiles ----------
create policy profiles_select_authenticated on public.profiles
  for select to authenticated using (true);           -- names needed for selectors
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- customers / contacts / suppliers ----------
create policy customers_read on public.customers for select to authenticated using (true);
create policy customers_write_financial on public.customers for insert to authenticated
  with check (public.has_financial_access());
create policy customers_update_financial on public.customers for update to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());
create policy customers_delete_admin on public.customers for delete to authenticated
  using (public.is_admin());

create policy customer_contacts_read on public.customer_contacts for select to authenticated using (true);
create policy customer_contacts_write_financial on public.customer_contacts for all to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());

create policy suppliers_read on public.suppliers for select to authenticated using (true);
create policy suppliers_write_financial on public.suppliers for all to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());
create policy suppliers_delete_admin on public.suppliers for delete to authenticated
  using (public.is_admin());

-- ---------- affairs & purchase orders ----------
create policy affairs_read on public.affairs for select to authenticated using (true);
create policy affairs_insert_financial on public.affairs for insert to authenticated
  with check (public.has_financial_access());
create policy affairs_update_financial on public.affairs for update to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());
create policy affairs_delete_admin on public.affairs for delete to authenticated
  using (public.is_admin());

create policy po_read on public.purchase_orders for select to authenticated using (true);
create policy po_write_financial on public.purchase_orders for all to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());
create policy po_lines_read on public.purchase_order_lines for select to authenticated using (true);
create policy po_lines_write_financial on public.purchase_order_lines for all to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());

-- ---------- expenses ----------
-- Everyone authenticated can create expenses (operational data entry);
-- reading/updating is restricted to financial roles.
create policy expenses_read_financial on public.expenses for select to authenticated
  using (public.has_financial_access() or created_by = auth.uid());
create policy expenses_insert on public.expenses for insert to authenticated
  with check (created_by = auth.uid());
create policy expenses_update_financial on public.expenses for update to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());
create policy expenses_delete_admin on public.expenses for delete to authenticated
  using (public.is_admin());

create policy expense_categories_read on public.expense_categories for select to authenticated using (true);
create policy expense_categories_admin on public.expense_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy expense_payments_read on public.expense_payments for select to authenticated
  using (public.has_financial_access());
create policy expense_payments_write on public.expense_payments for all to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());

-- ---------- fixed costs & allocations ----------
create policy fixed_costs_read on public.fixed_costs for select to authenticated
  using (public.has_financial_access());
create policy fixed_costs_write on public.fixed_costs for all to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());

create policy cost_allocations_read on public.cost_allocations for select to authenticated
  using (public.has_financial_access());
create policy cost_allocations_write on public.cost_allocations for all to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());

-- ---------- tasks ----------
create policy tasks_read on public.tasks for select to authenticated using (true);
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.current_user_role() in ('admin', 'manager') or assigned_to = auth.uid());
create policy tasks_update_participants on public.tasks for update to authenticated
  using (
    public.current_user_role() in ('admin', 'manager')
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  ) with check (
    public.current_user_role() in ('admin', 'manager')
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );
create policy tasks_delete_admin on public.tasks for delete to authenticated
  using (public.is_admin());

-- ---------- invoices & payments ----------
create policy invoices_read on public.invoices for select to authenticated
  using (public.has_financial_access());
create policy invoices_write on public.invoices for all to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());

create policy invoice_lines_read on public.invoice_lines for select to authenticated
  using (public.has_financial_access());
create policy invoice_lines_write on public.invoice_lines for all to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());

create policy payments_read on public.payments for select to authenticated
  using (public.has_financial_access());
create policy payments_write on public.payments for all to authenticated
  using (public.has_financial_access()) with check (public.has_financial_access());

-- ---------- documents ----------
create policy documents_read on public.documents for select to authenticated using (true);
create policy documents_insert on public.documents for insert to authenticated
  with check (uploaded_by = auth.uid());
create policy documents_update_own on public.documents for update to authenticated
  using (uploaded_by = auth.uid() or public.is_admin())
  with check (uploaded_by = auth.uid() or public.is_admin());
create policy documents_delete on public.documents for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_admin());

-- ---------- notifications: strictly per-user ----------
create policy notifications_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_insert_system on public.notifications for insert to authenticated
  with check (public.current_user_role() in ('admin', 'manager'));
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- ---------- audit logs: append-only, no user modifications ----------
create policy audit_logs_read_admin on public.audit_logs for select to authenticated
  using (public.is_admin());
-- No insert/update/delete policies: only the security-definer trigger function writes here.

-- ---------- app settings ----------
create policy app_settings_read on public.app_settings for select to authenticated using (true);
create policy app_settings_admin on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
