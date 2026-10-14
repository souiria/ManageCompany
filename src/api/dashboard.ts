import { requireSupabase } from '@/lib/supabase';
import type { AffairFinancials, DashboardKpis, MonthlyRevenueExpense } from '@/types/database';

/** KPI values come from the database view — never hardcoded. */
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const { data, error } = await requireSupabase().from('v_dashboard_kpis').select('*').single();
  if (error) throw error;
  return data as DashboardKpis;
}

export async function getMonthlyChart(): Promise<MonthlyRevenueExpense[]> {
  const { data, error } = await requireSupabase().from('v_monthly_revenue_expense').select('*').order('month');
  if (error) throw error;
  return (data ?? []) as MonthlyRevenueExpense[];
}

export async function getAffairFinancials(affairId?: string): Promise<AffairFinancials[]> {
  let query = requireSupabase()
    .from('v_affair_financials')
    .select('*')
    .order('gross_margin', { ascending: false });
  if (affairId) query = query.eq('affair_id', affairId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AffairFinancials[];
}

export async function getRecentActivity(limit = 10) {
  const { data, error } = await requireSupabase()
    .from('audit_logs')
    .select('id, table_name, action, created_at, actor_id')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
