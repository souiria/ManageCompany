import { requireSupabase } from '@/lib/supabase';
import type { Invoice, InvoiceLine, Payment } from '@/types/database';

export async function listInvoices(params: {
  search?: string;
  status?: string;
  customerId?: string;
  affairId?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const { page = 0, pageSize = 25, ...filters } = params;
  let query = requireSupabase()
    .from('invoices')
    .select('*, customers(id, company_name), affairs(id, internal_ref)', { count: 'exact' })
    .order('issue_date', { ascending: false });

  if (filters.search) query = query.ilike('invoice_number', `%${filters.search}%`);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.affairId) query = query.eq('affair_id', filters.affairId);

  const from = page * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw error;
  return { invoices: (data ?? []) as (Invoice & {
    customers: { id: string; company_name: string } | null;
    affairs: { id: string; internal_ref: string } | null;
  })[], total: count ?? 0 };
}

export async function getInvoice(id: string) {
  const { data, error } = await requireSupabase()
    .from('invoices')
    .select('*, invoice_lines(*), payments(*), customers(id, company_name), affairs(id, internal_ref)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Invoice & {
    invoice_lines: InvoiceLine[];
    payments: Payment[];
    customers: { id: string; company_name: string } | null;
    affairs: { id: string; internal_ref: string } | null;
  };
}

export async function createInvoice(input: {
  invoice_number: string;
  customer_id: string;
  affair_id?: string | null;
  issue_date: string;
  due_date?: string | null;
  notes?: string | null;
  lines: { description: string; quantity: number; unit_price: number; vat_rate: number }[];
}) {
  const supabase = requireSupabase();
  const { data: userData } = await supabase.auth.getUser();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: input.invoice_number,
      customer_id: input.customer_id,
      affair_id: input.affair_id ?? null,
      issue_date: input.issue_date,
      due_date: input.due_date ?? null,
      notes: input.notes ?? null,
      created_by: userData.user?.id,
    })
    .select()
    .single();
  if (error) throw error;

  // Totals are computed by DB triggers from the lines.
  const lines = input.lines.map((line) => ({
    ...line,
    invoice_id: invoice.id,
    amount_excluding_tax: Math.round(line.quantity * line.unit_price * 100) / 100,
  }));
  const { error: linesError } = await supabase.from('invoice_lines').insert(lines);
  if (linesError) throw linesError;

  const { data: complete, error: reloadError } = await supabase
    .from('invoices')
    .select('*, invoice_lines(*)')
    .eq('id', invoice.id)
    .single();
  if (reloadError) throw reloadError;
  return complete as Invoice & { invoice_lines: InvoiceLine[] };
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']) {
  const { data, error } = await requireSupabase().from('invoices').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data as Invoice;
}

export async function addPayment(invoiceId: string, payment: {
  payment_date: string;
  amount: number;
  payment_method: string;
  transaction_ref?: string;
  notes?: string;
}) {
  const supabase = requireSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('payments')
    .insert({ ...payment, invoice_id: invoiceId, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error; // DB trigger recalculates invoice status (partial/full)
  return data as Payment;
}
