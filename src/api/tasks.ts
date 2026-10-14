import { requireSupabase } from '@/lib/supabase';
import type { Task, TaskStatus } from '@/types/database';

export interface TaskListParams {
  search?: string;
  status?: TaskStatus | 'overdue';
  affairId?: string;
  assignedTo?: string;
  page?: number;
  pageSize?: number;
}

export async function listTasks({ search, status, affairId, assignedTo, page = 0, pageSize = 25 }: TaskListParams = {}) {
  let query = requireSupabase()
    .from('tasks')
    .select('*, affairs(id, internal_ref), profiles!tasks_assigned_to_fkey(id, full_name)', { count: 'exact' })
    .order('planned_date', { ascending: true, nullsFirst: false });

  if (search) query = query.ilike('title', `%${search}%`);
  if (affairId) query = query.eq('affair_id', affairId);
  if (assignedTo) query = query.eq('assigned_to', assignedTo);
  if (status === 'overdue') {
    query = query
      .not('planned_date', 'is', null)
      .lt('planned_date', new Date().toISOString().slice(0, 10))
      .neq('status', 'done');
  } else if (status) {
    query = query.eq('status', status);
  }

  const from = page * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw error;
  return {
    tasks: (data ?? []) as (Task & {
      affairs: { id: string; internal_ref: string } | null;
      profiles: { id: string; full_name: string } | null;
    })[],
    total: count ?? 0,
  };
}

export async function createTask(input: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>) {
  const supabase = requireSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...input, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<Task>) {
  const { data, error } = await requireSupabase().from('tasks').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Task;
}

export async function completeTask(id: string) {
  return updateTask(id, { status: 'done', completed_at: new Date().toISOString() });
}
