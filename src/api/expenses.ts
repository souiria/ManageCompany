import { requireSupabase } from '@/lib/supabase';
import type { Expense, ExpenseCategory } from '@/types/database';

export interface ExpenseListParams {
  search?: string;
  affairId?: string;
  supplierId?: string;
  categoryId?: string;
  paymentStatus?: string;
  approvalStatus?: string;
  fromDate?: string; // ISO
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export async function listExpenses(params: ExpenseListParams = {}) {
  const { page = 0, pageSize = 25, ...filters } = params;
  let query = requireSupabase()
    .from('expenses')
    .select(
      '*, suppliers(id, company_name), affairs(id, internal_ref), expense_categories(id, name)',
      { count: 'exact' },
    )
    .order('expense_date', { ascending: false });

  if (filters.search) query = query.ilike('description', `%${filters.search}%`);
  if (filters.affairId) query = query.eq('affair_id', filters.affairId);
  if (filters.supplierId) query = query.eq('supplier_id', filters.supplierId);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.paymentStatus) query = query.eq('payment_status', filters.paymentStatus);
  if (filters.approvalStatus) query = query.eq('approval_status', filters.approvalStatus);
  if (filters.fromDate) query = query.gte('expense_date', filters.fromDate);
  if (filters.toDate) query = query.lte('expense_date', filters.toDate);

  const from = page * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw error;
  return { expenses: (data ?? []) as ExpenseWithRelations[], total: count ?? 0 };
}

export type ExpenseWithRelations = Expense & {
  suppliers: { id: string; company_name: string } | null;
  affairs: { id: string; internal_ref: string } | null;
  expense_categories: { id: string; name: string } | null;
};

export async function getExpense(id: string) {
  const { data, error } = await requireSupabase()
    .from('expenses')
    .select('*, suppliers(*), affairs(id, internal_ref), expense_categories(*), expense_payments(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as ExpenseWithRelations & {
    expense_payments: { id: string; payment_date: string; amount: number; payment_method: string }[];
  };
}

export async function createExpense(input: NewExpense) {
  const supabase = requireSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...input, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as Expense;
}

export type NewExpense = {
  expense_date: string;
  affair_id?: string | null;
  supplier_id?: string | null;
  description: string;
  category_id?: string | null;
  classification?: 'fixed' | 'variable';
  amount_excluding_tax: number;
  vat_rate?: number;
  payment_method?: string | null;
  receipt_ref?: string | null;
  notes?: string | null;
};

export async function updateExpense(id: string, patch: Partial<Expense>) {
  const { data, error } = await requireSupabase().from('expenses').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Expense;
}

export async function setExpenseApproval(id: string, approval_status: 'approved' | 'rejected') {
  const supabase = requireSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('expenses')
    .update({ approval_status, approved_by: userData.user?.id, approval_date: new Date().toISOString().slice(0, 10) })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Expense;
}

export async function addExpensePayment(expenseId: string, payment: {
  payment_date: string;
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
}) {
  const supabase = requireSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('expense_payments')
    .insert({ ...payment, expense_id: expenseId, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error; // DB trigger updates payment_status
  return data;
}

export async function listExpenseCategories() {
  const { data, error } = await requireSupabase()
    .from('expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as ExpenseCategory[];
}

/** Totals grouped by category / supplier / affair for reports. */
export async function expenseTotalsBy(field: 'category_id' | 'supplier_id' | 'affair_id', fromDate?: string, toDate?: string) {
  let query = requireSupabase()
    .from('expenses')
    .select(field)
    .eq('approval_status', 'approved');
  if (fromDate) query = query.gte('expense_date', fromDate);
  if (toDate) query = query.lte('expense_date', toDate);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
