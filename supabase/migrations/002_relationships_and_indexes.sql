-- 002_relationships_and_indexes.sql
-- Indexes on frequently filtered columns. Foreign keys are declared in 001.

create index idx_customer_contacts_customer on public.customer_contacts (customer_id);
create index idx_customers_type on public.customers (customer_type) where archived = false;
create index idx_customers_ice on public.customers (ice) where ice is not null;

create index idx_affairs_customer on public.affairs (customer_id);
create index idx_affairs_status on public.affairs (status) where archived = false;
create index idx_affairs_responsible on public.affairs (responsible_id);
create index idx_affairs_delivery_date on public.affairs (planned_delivery_date);
create index idx_affairs_order_date on public.affairs (order_date);

create index idx_purchase_orders_affair on public.purchase_orders (affair_id);
create index idx_purchase_orders_number on public.purchase_orders (po_number);
create index idx_purchase_order_lines_po on public.purchase_order_lines (purchase_order_id);

create index idx_expenses_affair on public.expenses (affair_id);
create index idx_expenses_supplier on public.expenses (supplier_id);
create index idx_expenses_category on public.expenses (category_id);
create index idx_expenses_date on public.expenses (expense_date);
create index idx_expenses_payment_status on public.expenses (payment_status);
create index idx_expenses_approval_status on public.expenses (approval_status);
create index idx_expense_payments_expense on public.expense_payments (expense_id);

create index idx_cost_allocations_affair_period on public.cost_allocations (affair_id, period);
create index idx_cost_allocations_cost on public.cost_allocations (fixed_cost_id, period);

create index idx_tasks_affair on public.tasks (affair_id);
create index idx_tasks_assigned on public.tasks (assigned_to) where status <> 'done';
create index idx_tasks_planned_date on public.tasks (planned_date) where status <> 'done';
create index idx_tasks_status on public.tasks (status);

create index idx_invoices_affair on public.invoices (affair_id);
create index idx_invoices_customer on public.invoices (customer_id);
create index idx_invoices_status on public.invoices (status);
create index idx_invoices_issue_date on public.invoices (issue_date);
create index idx_invoice_lines_invoice on public.invoice_lines (invoice_id);
create index idx_payments_invoice on public.payments (invoice_id);
create index idx_payments_date on public.payments (payment_date);

create index idx_documents_affair on public.documents (affair_id);
create index idx_documents_invoice on public.documents (invoice_id);
create index idx_documents_expense on public.documents (expense_id);
create index idx_documents_type on public.documents (document_type);

create index idx_notifications_user_unread on public.notifications (user_id) where is_read = false;
create index idx_audit_logs_table_record on public.audit_logs (table_name, record_id);
create index idx_audit_logs_created on public.audit_logs (created_at desc);
