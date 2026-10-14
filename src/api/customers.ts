import { requireSupabase } from '@/lib/supabase';
import type { Customer, CustomerContact } from '@/types/database';

export interface CustomerListParams {
  search?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

export async function listCustomers({ search, type, page = 0, pageSize = 25 }: CustomerListParams = {}) {
  let query = requireSupabase()
    .from('customers')
    .select('*, customer_contacts(id)', { count: 'exact' })
    .eq('archived', false)
    .order('company_name');

  if (search) query = query.ilike('company_name', `%${search}%`);
  if (type) query = query.eq('customer_type', type);

  const from = page * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw error;
  return { customers: (data ?? []) as (Customer & { customer_contacts: Pick<CustomerContact, 'id'>[] })[], total: count ?? 0 };
}

export async function getCustomer(id: string) {
  const { data, error } = await requireSupabase()
    .from('customers')
    .select('*, customer_contacts(*), affairs(id, internal_ref, status, order_date)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Customer & {
    customer_contacts: CustomerContact[];
    affairs: { id: string; internal_ref: string; status: string; order_date: string | null }[];
  };
}

export async function createCustomer(input: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'archived'>) {
  const { data: userData } = await requireSupabase().auth.getUser();
  const { data, error } = await requireSupabase()
    .from('customers')
    .insert({ ...input, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(id: string, patch: Partial<Customer>) {
  const { data, error } = await requireSupabase().from('customers').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function archiveCustomer(id: string) {
  return updateCustomer(id, { archived: true });
}
