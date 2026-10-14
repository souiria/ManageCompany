import type { UserRole } from '@/constants/statuses';

/**
 * Client-side role helpers. These only drive UI visibility — real enforcement
 * happens in PostgreSQL RLS policies (see supabase/migrations/003_rls_policies.sql).
 */

const ROLE_HIERARCHY: Record<UserRole, number> = {
  employee: 1,
  accountant: 2,
  manager: 3,
  admin: 4,
};

export function roleAtLeast(role: UserRole | null | undefined, minimum: UserRole): boolean {
  if (!role) return false;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return role === 'admin';
}

export function canApproveExpenses(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'manager';
}

export function canEditFinancialData(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'accountant' || role === 'manager';
}

export function canDeleteRecords(role: UserRole | null | undefined): boolean {
  return role === 'admin';
}
