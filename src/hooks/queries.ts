import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as affairsApi from '@/api/affairs';
import * as customersApi from '@/api/customers';
import * as dashboardApi from '@/api/dashboard';
import * as expensesApi from '@/api/expenses';
import * as fixedCostsApi from '@/api/fixed-costs';
import * as invoicesApi from '@/api/invoices';
import * as suppliersApi from '@/api/suppliers';
import * as tasksApi from '@/api/tasks';
import { toUserMessage } from '@/lib/errors';

/** Centralized mutation wrapper: consistent invalidation + error surfacing. */
function useInvalidatingMutation<TInput, TOutput>(
  fn: (input: TInput) => Promise<TOutput>,
  keys: string[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

// ---------- dashboard ----------
export const useDashboardKpis = () =>
  useQuery({ queryKey: ['dashboard-kpis'], queryFn: dashboardApi.getDashboardKpis });
export const useMonthlyChart = () =>
  useQuery({ queryKey: ['monthly-chart'], queryFn: dashboardApi.getMonthlyChart });
export const useAffairFinancials = () =>
  useQuery({ queryKey: ['affair-financials'], queryFn: () => dashboardApi.getAffairFinancials() });

// ---------- lists ----------
export const useCustomers = (params: customersApi.CustomerListParams = {}) =>
  useQuery({ queryKey: ['customers', params], queryFn: () => customersApi.listCustomers(params) });
export const useCustomer = (id: string) =>
  useQuery({ queryKey: ['customer', id], queryFn: () => customersApi.getCustomer(id), enabled: !!id });
export const useSuppliers = (search?: string) =>
  useQuery({ queryKey: ['suppliers', search], queryFn: () => suppliersApi.listSuppliers(search) });
export const useAffairs = (params: affairsApi.AffairListParams = {}) =>
  useQuery({ queryKey: ['affairs', params], queryFn: () => affairsApi.listAffairs(params) });
export const useAffair = (id: string) =>
  useQuery({ queryKey: ['affair', id], queryFn: () => affairsApi.getAffair(id), enabled: !!id });
export const useExpenses = (params: expensesApi.ExpenseListParams = {}) =>
  useQuery({ queryKey: ['expenses', params], queryFn: () => expensesApi.listExpenses(params) });
export const useExpense = (id: string) =>
  useQuery({ queryKey: ['expense', id], queryFn: () => expensesApi.getExpense(id), enabled: !!id });
export const useExpenseCategories = () =>
  useQuery({ queryKey: ['expense-categories'], queryFn: expensesApi.listExpenseCategories });
export const useTasks = (params: tasksApi.TaskListParams = {}) =>
  useQuery({ queryKey: ['tasks', params], queryFn: () => tasksApi.listTasks(params) });
export const useInvoices = (params: Parameters<typeof invoicesApi.listInvoices>[0] = {}) =>
  useQuery({ queryKey: ['invoices', params], queryFn: () => invoicesApi.listInvoices(params) });
export const useInvoice = (id: string) =>
  useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesApi.getInvoice(id), enabled: !!id });
export const useFixedCosts = () =>
  useQuery({ queryKey: ['fixed-costs'], queryFn: () => fixedCostsApi.listFixedCosts() });
export const useAllocations = (period?: string) =>
  useQuery({ queryKey: ['allocations', period], queryFn: () => fixedCostsApi.listAllocations(period) });

// ---------- mutations ----------
export const useCreateCustomer = () =>
  useInvalidatingMutation(customersApi.createCustomer, ['customers']);
export const useUpdateCustomer = () =>
  useInvalidatingMutation((p: { id: string; patch: Parameters<typeof customersApi.updateCustomer>[1] }) =>
    customersApi.updateCustomer(p.id, p.patch), ['customers', 'customer']);
export const useCreateSupplier = () =>
  useInvalidatingMutation(suppliersApi.createSupplier, ['suppliers']);
export const useCreateAffair = () =>
  useInvalidatingMutation(affairsApi.createAffair, ['affairs']);
export const useUpdateAffair = () =>
  useInvalidatingMutation((p: { id: string; patch: Parameters<typeof affairsApi.updateAffair>[1] }) =>
    affairsApi.updateAffair(p.id, p.patch), ['affairs', 'affair']);
export const useCreateExpense = () =>
  useInvalidatingMutation(expensesApi.createExpense, ['expenses', 'dashboard-kpis']);
export const useApproveExpense = () =>
  useInvalidatingMutation((p: { id: string; status: 'approved' | 'rejected' }) =>
    expensesApi.setExpenseApproval(p.id, p.status), ['expenses', 'expense', 'dashboard-kpis']);
export const useCreateTask = () =>
  useInvalidatingMutation(tasksApi.createTask, ['tasks']);
export const useUpdateTask = () =>
  useInvalidatingMutation((p: { id: string; patch: Parameters<typeof tasksApi.updateTask>[1] }) =>
    tasksApi.updateTask(p.id, p.patch), ['tasks', 'dashboard-kpis']);
export const useCreateInvoice = () =>
  useInvalidatingMutation(invoicesApi.createInvoice, ['invoices', 'affair-financials', 'dashboard-kpis']);
export const useAddPayment = () =>
  useInvalidatingMutation((p: { invoiceId: string; payment: Parameters<typeof invoicesApi.addPayment>[1] }) =>
    invoicesApi.addPayment(p.invoiceId, p.payment), ['invoices', 'invoice', 'dashboard-kpis']);

/** Convenience: friendly error message from a mutation error. */
export function mutationErrorMessage(error: unknown): string {
  return toUserMessage(error);
}
