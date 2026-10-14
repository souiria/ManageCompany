import { requireSupabase } from '@/lib/supabase';
import type { Expense } from '@/types/database';

/** Generic CSV builder — used by every report export. */
export function toCSV(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (v: string | number | null) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(';')).join('\n');
}

/** Expenses report with date filters (from validated DB rows only). */
export async function buildExpensesReport(fromDate?: string, toDate?: string) {
  let query = requireSupabase()
    .from('expenses')
    .select('expense_date, description, amount_excluding_tax, vat_rate, amount_including_tax, payment_status, approval_status, suppliers(company_name), affairs(internal_ref), expense_categories(name)')
    .order('expense_date', { ascending: false });
  if (fromDate) query = query.gte('expense_date', fromDate);
  if (toDate) query = query.lte('expense_date', toDate);
  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as unknown as (Expense & {
    suppliers: { company_name: string } | null;
    affairs: { internal_ref: string } | null;
    expense_categories: { name: string } | null;
  })[]).map((e) => [
    e.expense_date, e.description, e.suppliers?.company_name ?? '', e.affairs?.internal_ref ?? '',
    e.expense_categories?.name ?? '', e.amount_excluding_tax, e.vat_rate, e.amount_including_tax,
    e.payment_status, e.approval_status,
  ]);

  return toCSV(
    ['Date', 'Désignation', 'Fournisseur', 'Affaire', 'Catégorie', 'Montant HT', 'TVA %', 'Montant TTC', 'Paiement', 'Approbation'],
    rows,
  );
}

/** Profitability report from the shared view (consistent with dashboard). */
export async function buildProfitabilityReport() {
  const { data, error } = await requireSupabase()
    .from('v_affair_financials')
    .select('*')
    .order('gross_margin', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []).map((r) => [
    r.internal_ref, r.customer_name, r.status,
    r.order_value_excluding_tax, r.invoiced_revenue_excluding_tax, r.collected_revenue,
    r.variable_costs, r.allocated_fixed_costs, r.total_cost,
    r.gross_margin, r.margin_percent ?? '',
  ]);
  return toCSV(
    ['Réf.', 'Client', 'Statut', 'Commandes HT', 'CA facturé HT', 'Encaissé', 'Coûts variables', 'Charges fixes allouées', 'Coût total', 'Marge brute', 'Marge %'],
    rows,
  );
}

/** Overdue tasks report. */
export async function buildOverdueTasksReport() {
  const { data, error } = await requireSupabase().from('v_overdue_tasks').select('*');
  if (error) throw error;
  const rows = (data ?? []).map((t: { title: string; planned_date: string | null; status: string; internal_ref: string | null }) => [
    t.title, t.planned_date ?? '', t.status, t.internal_ref ?? '',
  ]);
  return toCSV(['Tâche', 'Échéance', 'Statut', 'Affaire'], rows);
}

/** Missing documents report. */
export async function buildMissingDocumentsReport() {
  const { data, error } = await requireSupabase().from('v_missing_documents').select('*');
  if (error) throw error;
  const rows = (data ?? []).map((d: { kind: string; label: string; document_date: string | null }) => [
    d.kind, d.label, d.document_date ?? '',
  ]);
  return toCSV(['Type', 'Élément', 'Date'], rows);
}
