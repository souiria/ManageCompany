import { requireSupabase } from '@/lib/supabase';
import type { Affair, AffairStatus, PurchaseOrder } from '@/types/database';

export interface AffairListParams {
  search?: string;
  status?: AffairStatus | 'overdue';
  customerId?: string;
  page?: number;
  pageSize?: number;
}

export async function listAffairs({ search, status, customerId, page = 0, pageSize = 25 }: AffairListParams = {}) {
  let query = requireSupabase()
    .from('affairs')
    .select('*, customers(id, company_name), profiles!affairs_responsible_id_fkey(id, full_name)', { count: 'exact' })
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (search) query = query.or(`internal_ref.ilike.%${search}%,description.ilike.%${search}%`);
  if (customerId) query = query.eq('customer_id', customerId);
  if (status === 'overdue') {
    query = query
      .not('planned_delivery_date', 'is', null)
      .lt('planned_delivery_date', new Date().toISOString().slice(0, 10))
      .not('status', 'in', '(closed,cancelled,invoiced)');
  } else if (status) {
    query = query.eq('status', status);
  }

  const from = page * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw error;
  return {
    affairs: (data ?? []) as (Affair & {
      customers: { id: string; company_name: string } | null;
      profiles: { id: string; full_name: string } | null;
    })[],
    total: count ?? 0,
  };
}

export async function getAffair(id: string) {
  const { data, error } = await requireSupabase()
    .from('affairs')
    .select('*, customers(*), purchase_orders(*), tasks(*), profiles!affairs_responsible_id_fkey(id, full_name)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Affair & {
    customers: { id: string; company_name: string; customer_type: string } | null;
    purchase_orders: PurchaseOrder[];
    tasks: { id: string; title: string; status: string; planned_date: string | null }[];
    profiles: { id: string; full_name: string } | null;
  };
}

/** Generate next internal reference: AFF-<year>-<seq padded to 4>. */
export async function nextInternalRef(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `AFF-${year}-`;
  const { data, error } = await requireSupabase()
    .from('affairs')
    .select('internal_ref')
    .like('internal_ref', `${prefix}%`)
    .order('internal_ref', { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.internal_ref;
  const seq = last ? parseInt(last.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export async function createAffair(
  input: Omit<Affair, 'id' | 'created_at' | 'updated_at' | 'internal_ref' | 'status' | 'archived'>,
) {
  const supabase = requireSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const internal_ref = await nextInternalRef();
  const { data, error } = await supabase
    .from('affairs')
    .insert({ ...input, internal_ref, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as Affair;
}

export async function updateAffair(id: string, patch: Partial<Affair>) {
  const { data, error } = await requireSupabase().from('affairs').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Affair;
}

export async function archiveAffair(id: string) {
  return updateAffair(id, { archived: true });
}

// ----- purchase orders -----

export async function addPurchaseOrder(
  input: Omit<PurchaseOrder, 'id' | 'vat_amount' | 'amount_including_tax'>,
) {
  const { data, error } = await requireSupabase().from('purchase_orders').insert(input).select().single();
  if (error) throw error; // unique(affair_id, po_number) → duplicate detection via 23505
  return data as PurchaseOrder;
}

export async function updatePurchaseOrder(id: string, patch: Partial<PurchaseOrder>) {
  const { data, error } = await requireSupabase().from('purchase_orders').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as PurchaseOrder;
}
