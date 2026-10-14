import { requireSupabase } from '@/lib/supabase';
import { monthlyEquivalent, round2 } from '@/lib/finance';
import type { CostAllocation, FixedCost } from '@/types/database';

export async function listFixedCosts(activeOnly = true) {
  let query = requireSupabase().from('fixed_costs').select('*').order('description');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as FixedCost[];
}

export async function createFixedCost(input: Omit<FixedCost, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = requireSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('fixed_costs')
    .insert({ ...input, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as FixedCost;
}

export async function updateFixedCost(id: string, patch: Partial<FixedCost>) {
  const { data, error } = await requireSupabase().from('fixed_costs').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as FixedCost;
}

export async function listAllocations(period?: string) {
  let query = requireSupabase()
    .from('cost_allocations')
    .select('*, fixed_costs(id, description), affairs(id, internal_ref)')
    .order('period', { ascending: false });
  if (period) query = query.eq('period', period);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as (CostAllocation & {
    fixed_costs: { id: string; description: string } | null;
    affairs: { id: string; internal_ref: string } | null;
  })[];
}

export interface AllocateInput {
  fixed_cost_id: string;
  period: string; // YYYY-MM
  affair_id: string;
  allocation_percent: number;
  calculation_method?: CostAllocation['calculation_method'];
}

/** Manual allocation. unique(fixed_cost_id, affair_id, period) prevents duplicates (error 23505). */
export async function createAllocation(input: AllocateInput) {
  const { data: cost, error: costError } = await requireSupabase()
    .from('fixed_costs')
    .select('amount, frequency')
    .eq('id', input.fixed_cost_id)
    .single();
  if (costError) throw costError;

  const monthly = monthlyEquivalent(cost.amount as number, cost.frequency);
  const allocated_amount = round2((monthly * input.allocation_percent) / 100);

  const { data, error } = await requireSupabase()
    .from('cost_allocations')
    .insert({ ...input, allocated_amount })
    .select()
    .single();
  if (error) throw error;
  return data as CostAllocation;
}

/** Equal split of a fixed cost across the given affairs for one period. */
export async function allocateEqually(fixedCostId: string, period: string, affairIds: string[]) {
  if (affairIds.length === 0) return [];
  const percent = round2(100 / affairIds.length);
  const results: CostAllocation[] = [];
  for (const affair_id of affairIds) {
    results.push(
      await createAllocation({
        fixed_cost_id: fixedCostId,
        period,
        affair_id,
        allocation_percent: percent,
        calculation_method: 'equal',
      }),
    );
  }
  return results;
}
