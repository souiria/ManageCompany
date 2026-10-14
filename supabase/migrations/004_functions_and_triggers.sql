-- 004_functions_and_triggers.sql
-- updated_at maintenance, signup provisioning, protections, financial triggers, audit.

-- ---------- updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_customers_updated before update on public.customers for each row execute function public.set_updated_at();
create trigger trg_suppliers_updated before update on public.suppliers for each row execute function public.set_updated_at();
create trigger trg_affairs_updated before update on public.affairs for each row execute function public.set_updated_at();
create trigger trg_expenses_updated before update on public.expenses for each row execute function public.set_updated_at();
create trigger trg_fixed_costs_updated before update on public.fixed_costs for each row execute function public.set_updated_at();
create trigger trg_tasks_updated before update on public.tasks for each row execute function public.set_updated_at();
create trigger trg_invoices_updated before update on public.invoices for each row execute function public.set_updated_at();

-- ---------- auto-provision profile on signup (role defaults to 'employee' — never admin) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'employee')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- users cannot promote themselves to admin ----------
create or replace function public.prevent_self_admin_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'admin' and (old.role is distinct from new.role) and auth.uid() = new.id then
    raise exception 'Vous ne pouvez pas vous attribuer le rôle administrateur.';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_role_guard
  before update of role on public.profiles
  for each row execute function public.prevent_self_admin_escalation();

-- ---------- VAT computation ----------
create or replace function public.apply_vat()
returns trigger
language plpgsql
as $$
begin
  new.vat_amount = round(new.amount_excluding_tax * new.vat_rate / 100, 2);
  new.amount_including_tax = new.amount_excluding_tax + new.vat_amount;
  return new;
end;
$$;

create trigger trg_expenses_vat before insert or update of amount_excluding_tax, vat_rate on public.expenses
  for each row execute function public.apply_vat();
create trigger trg_po_vat before insert or update of amount_excluding_tax, vat_rate on public.purchase_orders
  for each row execute function public.apply_vat();

-- ---------- invoice lines: recompute invoice totals ----------
create or replace function public.recalc_invoice_totals(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ht numeric(14,2);
  v_vat numeric(14,2);
begin
  select coalesce(sum(l.amount_excluding_tax), 0),
         coalesce(sum(round(l.amount_excluding_tax * l.vat_rate / 100, 2)), 0)
    into v_ht, v_vat
    from public.invoice_lines l
   where l.invoice_id = p_invoice_id;

  update public.invoices i
     set total_excluding_tax = v_ht,
         total_vat = v_vat,
         total_including_tax = v_ht + v_vat
   where i.id = p_invoice_id;
end;
$$;

create or replace function public.tg_invoice_lines_recalc()
returns trigger
language plpgsql
as $$
begin
  perform public.recalc_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  return coalesce(new, old);
end;
$$;

create trigger trg_invoice_lines_aiud
  after insert or update or delete on public.invoice_lines
  for each row execute function public.tg_invoice_lines_recalc();

-- ---------- payments: update invoice payment status ----------
create or replace function public.update_invoice_payment_status(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric(14,2);
  v_paid numeric(14,2);
begin
  select i.total_including_tax into v_total from public.invoices i where i.id = p_invoice_id;
  select coalesce(sum(p.amount), 0) into v_paid from public.payments p where p.invoice_id = p_invoice_id;

  update public.invoices i
     set status = case
                    when i.status = 'cancelled' then 'cancelled'
                    when v_paid <= 0 then 'sent'
                    when v_paid >= v_total then 'paid'
                    else 'partially_paid'
                  end
   where i.id = p_invoice_id;
end;
$$;

create or replace function public.tg_payments_status()
returns trigger
language plpgsql
as $$
begin
  perform public.update_invoice_payment_status(coalesce(new.invoice_id, old.invoice_id));
  return coalesce(new, old);
end;
$$;

create trigger trg_payments_aiud
  after insert or update or delete on public.payments
  for each row execute function public.tg_payments_status();

-- ---------- expense payments: update expense payment status ----------
create or replace function public.update_expense_payment_status(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric(14,2);
  v_paid numeric(14,2);
begin
  select e.amount_including_tax into v_total from public.expenses e where e.id = p_expense_id;
  select coalesce(sum(p.amount), 0) into v_paid from public.expense_payments p where p.expense_id = p_expense_id;

  update public.expenses e
     set payment_status = case
                            when v_paid <= 0 then 'unpaid'
                            when v_paid >= v_total then 'paid'
                            else 'partial'
                          end,
         payment_date = case when v_paid > 0 then coalesce(e.payment_date, current_date) else e.payment_date end
   where e.id = p_expense_id;
end;
$$;

create or replace function public.tg_expense_payments_status()
returns trigger
language plpgsql
as $$
begin
  perform public.update_expense_payment_status(coalesce(new.expense_id, old.expense_id));
  return coalesce(new, old);
end;
$$;

create trigger trg_expense_payments_aiud
  after insert or update or delete on public.expense_payments
  for each row execute function public.tg_expense_payments_status();

-- ---------- audit (append-only, written by trigger only) ----------
create or replace function public.audit_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, actor_id)
  values (
    tg_table_name,
    coalesce((to_jsonb(old) ->> 'id')::uuid, (to_jsonb(new) ->> 'id')::uuid),
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

create trigger trg_audit_customers after insert or update or delete on public.customers for each row execute function public.audit_changes();
create trigger trg_audit_suppliers after insert or update or delete on public.suppliers for each row execute function public.audit_changes();
create trigger trg_audit_affairs after insert or update or delete on public.affairs for each row execute function public.audit_changes();
create trigger trg_audit_expenses after insert or update or delete on public.expenses for each row execute function public.audit_changes();
create trigger trg_audit_invoices after insert or update or delete on public.invoices for each row execute function public.audit_changes();
create trigger trg_audit_payments after insert or update or delete on public.payments for each row execute function public.audit_changes();
create trigger trg_audit_fixed_costs after insert or update or delete on public.fixed_costs for each row execute function public.audit_changes();

-- ---------- first admin bootstrap helper ----------
-- Run ONCE manually in the SQL editor after creating your own account, e.g.:
--   select public.make_admin('your-email@company.ma');
create or replace function public.make_admin(user_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_count int;
begin
  select count(*) into v_count from public.profiles where role = 'admin';
  if v_count > 0 then
    raise exception 'Un administrateur existe déjà. Gérez les rôles via l''application.';
  end if;
  select id into v_id from auth.users where email = user_email;
  if v_id is null then raise exception 'Utilisateur introuvable: %', user_email; end if;
  update public.profiles set role = 'admin' where id = v_id;
end;
$$;
