-- 001_initial_schema.sql
-- LTM Company Management — base schema, enums and tables.
-- Monetary values use numeric(14,2); business dates use date; timestamps timestamptz.

create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type public.user_role as enum ('admin', 'manager', 'accountant', 'employee');
create type public.customer_type as enum ('public', 'private');
create type public.order_type as enum ('purchase_order', 'public_contract', 'private_contract');
create type public.affair_status as enum ('draft', 'in_progress', 'partially_delivered', 'delivered', 'invoiced', 'closed', 'cancelled');
create type public.expense_classification as enum ('fixed', 'variable');
create type public.payment_status as enum ('unpaid', 'partial', 'paid');
create type public.approval_status as enum ('pending', 'approved', 'rejected');
create type public.payment_method as enum ('cash', 'bank_transfer', 'cheque', 'credit_card', 'other');
create type public.task_status as enum ('planned', 'in_progress', 'done', 'blocked');
create type public.task_priority as enum ('high', 'medium', 'low');
create type public.invoice_status as enum ('draft', 'sent', 'partially_paid', 'paid', 'cancelled');
create type public.fixed_cost_frequency as enum ('monthly', 'quarterly', 'annually', 'one_time');
create type public.allocation_method as enum ('percentage', 'equal', 'revenue_proportional', 'manual');
create type public.document_type as enum ('purchase_order', 'quotation', 'invoice', 'delivery_note', 'expense_receipt', 'contract', 'other');

-- ---------- profiles (extends auth.users) ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        public.user_role not null default 'employee',
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- customers ----------
create table public.customers (
  id           uuid primary key default gen_random_uuid(),
  company_name text not null,
  ice          text,                     -- stored as text (identifier, not a number)
  customer_type public.customer_type not null default 'private',
  address      text,
  phones       text[] not null default '{}',
  emails       text[] not null default '{}',
  notes        text,
  archived     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id)
);
create unique index customers_company_name_lower_key on public.customers (lower(company_name));

create table public.customer_contacts (
  id         uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  full_name  text not null,
  position   text,
  phone      text,
  email      text,
  notes      text,
  created_at timestamptz not null default now()
);

-- ---------- suppliers ----------
create table public.suppliers (
  id             uuid primary key default gen_random_uuid(),
  company_name   text not null,
  ice            text,
  specialty      text,
  contact_person text,
  phone          text,
  email          text,
  address        text,
  notes          text,
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id)
);
create unique index suppliers_company_name_lower_key on public.suppliers (lower(company_name));

-- ---------- affairs (central business module) ----------
create table public.affairs (
  id                    uuid primary key default gen_random_uuid(),
  internal_ref          text not null unique,   -- e.g. AFF-2026-0042 (stable internal ID, NOT the customer PO)
  customer_id           uuid not null references public.customers (id),
  description           text,
  order_type            public.order_type not null default 'purchase_order',
  buyer                 text,
  requester             text,
  customer_contact_info text,
  order_date            date,
  planned_delivery_date date,
  actual_delivery_date  date,
  status                public.affair_status not null default 'draft',
  responsible_id        uuid references public.profiles (id),
  odoo_quote_ref        text,
  notes                 text,
  archived              boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles (id)
);

-- ---------- purchase orders (multiple POs allowed per affair) ----------
create table public.purchase_orders (
  id                    uuid primary key default gen_random_uuid(),
  affair_id             uuid not null references public.affairs (id) on delete cascade,
  po_number             text not null,          -- customer PO number (kept distinct from internal ref)
  description           text,
  amount_excluding_tax  numeric(14,2) not null default 0 check (amount_excluding_tax >= 0),
  vat_rate              numeric(5,2) not null default 20 check (vat_rate >= 0),
  vat_amount            numeric(14,2) not null default 0,
  amount_including_tax  numeric(14,2) not null default 0,
  order_date            date,
  planned_delivery_date date,
  actual_delivery_date  date,
  status                public.affair_status not null default 'draft',
  unique (affair_id, po_number)                  -- duplicate detection inside an affair
);

create table public.purchase_order_lines (
  id                   uuid primary key default gen_random_uuid(),
  purchase_order_id    uuid not null references public.purchase_orders (id) on delete cascade,
  description          text not null,
  quantity             numeric(12,3) not null default 1 check (quantity > 0),
  unit_price           numeric(14,2) not null default 0 check (unit_price >= 0),
  vat_rate             numeric(5,2) not null default 20,
  amount_excluding_tax numeric(14,2) not null default 0
);

-- ---------- expense categories ----------
create table public.expense_categories (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  classification public.expense_classification not null default 'variable',
  is_active      boolean not null default true
);

-- ---------- expenses ----------
create table public.expenses (
  id                   uuid primary key default gen_random_uuid(),
  expense_date         date not null,
  affair_id            uuid references public.affairs (id) on delete set null,
  supplier_id          uuid references public.suppliers (id) on delete set null,
  description          text not null,
  category_id          uuid references public.expense_categories (id),
  classification       public.expense_classification not null default 'variable',
  amount_excluding_tax numeric(14,2) not null default 0 check (amount_excluding_tax >= 0),
  vat_rate             numeric(5,2) not null default 20 check (vat_rate >= 0),
  vat_amount           numeric(14,2) not null default 0,
  amount_including_tax numeric(14,2) not null default 0,
  payment_method       public.payment_method,
  payment_status       public.payment_status not null default 'unpaid',
  payment_date         date,
  receipt_ref          text,
  receipt_received     boolean not null default false,
  receipt_path         text,                     -- private Supabase Storage path
  approval_status      public.approval_status not null default 'pending',
  approved_by          uuid references public.profiles (id),
  approval_date        date,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references public.profiles (id)
);

create table public.expense_payments (
  id             uuid primary key default gen_random_uuid(),
  expense_id     uuid not null references public.expenses (id) on delete cascade,
  payment_date   date not null,
  amount         numeric(14,2) not null check (amount > 0),
  payment_method public.payment_method not null default 'bank_transfer',
  reference      text,
  notes          text,
  created_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id)
);

-- ---------- fixed costs ----------
create table public.fixed_costs (
  id                uuid primary key default gen_random_uuid(),
  description       text not null,
  category          text,
  amount            numeric(14,2) not null check (amount >= 0),
  currency          char(3) not null default 'MAD',
  frequency         public.fixed_cost_frequency not null default 'monthly',
  start_date        date,
  end_date          date,
  is_active         boolean not null default true,
  allocation_method public.allocation_method not null default 'equal',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles (id)
);

create table public.cost_allocations (
  id                 uuid primary key default gen_random_uuid(),
  fixed_cost_id      uuid not null references public.fixed_costs (id) on delete cascade,
  period             char(7) not null check (period ~ '^\d{4}-\d{2}$'),  -- YYYY-MM
  affair_id          uuid not null references public.affairs (id) on delete cascade,
  allocation_percent numeric(5,2) not null check (allocation_percent > 0 and allocation_percent <= 100),
  allocated_amount   numeric(14,2) not null check (allocated_amount >= 0),
  calculation_method public.allocation_method not null,
  created_at         timestamptz not null default now(),
  unique (fixed_cost_id, affair_id, period)       -- no duplicate allocation per cost/affair/period
);

-- ---------- tasks ----------
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  affair_id    uuid references public.affairs (id) on delete set null,
  assigned_to  uuid references public.profiles (id),
  planned_date date,
  completed_at timestamptz,
  status       public.task_status not null default 'planned',
  priority     public.task_priority not null default 'medium',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id)
);

-- ---------- invoices & payments ----------
create table public.invoices (
  id                 uuid primary key default gen_random_uuid(),
  invoice_number     text not null unique,
  affair_id          uuid references public.affairs (id) on delete set null,
  customer_id        uuid not null references public.customers (id),
  issue_date         date not null default current_date,
  due_date           date,
  status             public.invoice_status not null default 'sent',
  total_excluding_tax numeric(14,2) not null default 0,
  total_vat          numeric(14,2) not null default 0,
  total_including_tax numeric(14,2) not null default 0,
  pdf_path           text,
  odoo_ref           text,                       -- future Odoo integration hook
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.profiles (id)
);

create table public.invoice_lines (
  id                   uuid primary key default gen_random_uuid(),
  invoice_id           uuid not null references public.invoices (id) on delete cascade,
  description          text not null,
  quantity             numeric(12,3) not null default 1,
  unit_price           numeric(14,2) not null default 0,
  vat_rate             numeric(5,2) not null default 20,
  amount_excluding_tax numeric(14,2) not null default 0
);

create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  invoice_id     uuid not null references public.invoices (id) on delete cascade,
  payment_date   date not null default current_date,
  amount         numeric(14,2) not null check (amount > 0),
  payment_method public.payment_method not null default 'bank_transfer',
  transaction_ref text,
  notes          text,
  created_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id)
);

-- ---------- documents ----------
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  document_type public.document_type not null,
  file_name    text not null,
  file_path    text not null unique,             -- private storage object path
  mime_type    text,
  size_bytes   bigint check (size_bytes is null or size_bytes <= 10485760), -- 10 MB
  affair_id    uuid references public.affairs (id) on delete set null,
  customer_id  uuid references public.customers (id) on delete set null,
  supplier_id  uuid references public.suppliers (id) on delete set null,
  expense_id   uuid references public.expenses (id) on delete set null,
  invoice_id   uuid references public.invoices (id) on delete set null,
  task_id      uuid references public.tasks (id) on delete set null,
  uploaded_by  uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);

-- ---------- notifications ----------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  body       text,
  is_read    boolean not null default false,
  link       text,
  created_at timestamptz not null default now()
);

-- ---------- audit logs (append-only) ----------
create table public.audit_logs (
  id         bigint generated always as identity primary key,
  table_name text not null,
  record_id  uuid,
  action     text not null check (action in ('insert', 'update', 'delete')),
  old_data   jsonb,
  new_data   jsonb,
  actor_id   uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- app settings ----------
create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
