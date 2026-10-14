import { requireSupabase } from '@/lib/supabase';
import type { Supplier } from '@/types/database';

export async function listSuppliers(search?: string, page = 0, pageSize = 25) {
  let query = requireSupabase()
    .from('suppliers')
    .select('*, expenses(id)', { count: 'exact' })
    .eq('archived', false)
    .order('company_name');

  if (search) query = query.ilike('company_name', `%${search}%`);

  const from = page * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw error;
  return { suppliers: (data ?? []) as (Supplier & { expenses: { id: string }[] })[], total: count ?? 0 };
}

export async function getSupplier(id: string) {
  const { data, error } = await requireSupabase()
    .from('suppliers')
    .select('*, expenses(*, affairs(id, internal_ref))')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Supplier & {
    expenses: { id: string; description: string; amount_including_tax: number; expense_date: string; affairs: { id: string; internal_ref: string } | null }[];
  };
}

export async function createSupplier(input: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'archived'>) {
  const { data: userData } = await requireSupabase().auth.getUser();
  const { data, error } = await requireSupabase()
    .from('suppliers')
    .insert({ ...input, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as Supplier;
}

export async function updateSupplier(id: string, patch: Partial<Supplier>) {
  const { data, error } = await requireSupabase().from('suppliers').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Supplier;
}
