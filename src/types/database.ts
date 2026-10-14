/**
 * Database types for the LTM schema.
 * Regenerate with `supabase gen types typescript` once connected to your project
 * and replace this file; the shapes below mirror supabase/migrations exactly.
 */

export type UserRole = 'admin' | 'manager' | 'accountant' | 'employee';
export type CustomerType = 'public' | 'private';
export type OrderType = 'purchase_order' | 'public_contract' | 'private_contract';
export type AffairStatus =
  | 'draft' | 'in_progress' | 'partially_delivered' | 'delivered' | 'invoiced' | 'closed' | 'cancelled';
export type ExpenseClassification = 'fixed' | 'variable';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'credit_card' | 'other';
export type TaskStatus = 'planned' | 'in_progress' | 'done' | 'blocked';
export type TaskPriority = 'high' | 'medium' | 'low';
export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'cancelled';
export type FixedCostFrequency = 'monthly' | 'quarterly' | 'annually' | 'one_time';
export type AllocationMethod = 'percentage' | 'equal' | 'revenue_proportional' | 'manual';
export type DocumentType =
  | 'purchase_order' | 'quotation' | 'invoice' | 'delivery_note'
  | 'expense_receipt' | 'contract' | 'other';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  company_name: string;
  ice: string | null;
  customer_type: CustomerType;
  address: string | null;
  phones: string[];
  emails: string[];
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CustomerContact {
  id: string;
  customer_id: string;
  full_name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  company_name: string;
  ice: string | null;
  specialty: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Affair {
  id: string;
  internal_ref: string;
  customer_id: string;
  description: string | null;
  order_type: OrderType;
  buyer: string | null;
  requester: string | null;
  customer_contact_info: string | null;
  order_date: string | null;
  planned_delivery_date: string | null;
  actual_delivery_date: string | null;
  status: AffairStatus;
  responsible_id: string | null;
  odoo_quote_ref: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PurchaseOrder {
  id: string;
  affair_id: string;
  po_number: string;
  description: string | null;
  amount_excluding_tax: number;
  vat_rate: number;
  vat_amount: number;
  amount_including_tax: number;
  order_date: string | null;
  planned_delivery_date: string | null;
  actual_delivery_date: string | null;
  status: AffairStatus;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  classification: ExpenseClassification;
  is_active: boolean;
}

export interface Expense {
  id: string;
  expense_date: string;
  affair_id: string | null;
  supplier_id: string | null;
  description: string;
  category_id: string | null;
  classification: ExpenseClassification;
  amount_excluding_tax: number;
  vat_rate: number;
  vat_amount: number;
  amount_including_tax: number;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  payment_date: string | null;
  receipt_ref: string | null;
  receipt_received: boolean;
  receipt_path: string | null;
  approval_status: ApprovalStatus;
  approved_by: string | null;
  approval_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface FixedCost {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  currency: string;
  frequency: FixedCostFrequency;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  allocation_method: AllocationMethod;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CostAllocation {
  id: string;
  fixed_cost_id: string;
  period: string;
  affair_id: string;
  allocation_percent: number;
  allocated_amount: number;
  calculation_method: AllocationMethod;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  affair_id: string | null;
  assigned_to: string | null;
  planned_date: string | null;
  completed_at: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  affair_id: string | null;
  customer_id: string;
  issue_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  total_excluding_tax: number;
  total_vat: number;
  total_including_tax: number;
  pdf_path: string | null;
  odoo_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  amount_excluding_tax: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_ref: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Document {
  id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  affair_id: string | null;
  customer_id: string | null;
  supplier_id: string | null;
  expense_id: string | null;
  invoice_id: string | null;
  task_id: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

/** Views */
export interface AffairFinancials {
  affair_id: string;
  internal_ref: string;
  status: AffairStatus;
  customer_id: string;
  customer_name: string;
  order_value_excluding_tax: number;
  invoiced_revenue_excluding_tax: number;
  collected_revenue: number;
  outstanding_receivables: number;
  variable_costs: number;
  allocated_fixed_costs: number;
  total_cost: number;
  gross_margin: number;
  margin_percent: number | null;
}

export interface DashboardKpis {
  total_affairs: number;
  affairs_in_progress: number;
  affairs_closed: number;
  affairs_overdue: number;
  po_revenue_excluding_tax: number;
  invoiced_revenue_excluding_tax: number;
  collected_payments: number;
  outstanding_customers: number;
  variable_expenses: number;
  allocated_fixed_costs: number;
  total_costs: number;
  missing_expense_receipts: number;
  overdue_tasks: number;
}

export interface MonthlyRevenueExpense {
  month: string;
  revenue: number | null;
  expenses: number | null;
}

/** Minimal Database shape used by SupabaseClient<Database> typing. */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      customers: { Row: Customer; Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Customer> };
      customer_contacts: { Row: CustomerContact; Insert: Omit<CustomerContact, 'id' | 'created_at'> & { id?: string }; Update: Partial<CustomerContact> };
      suppliers: { Row: Supplier; Insert: Omit<Supplier, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Supplier> };
      affairs: { Row: Affair; Insert: Omit<Affair, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Affair> };
      purchase_orders: { Row: PurchaseOrder; Insert: Omit<PurchaseOrder, 'id'> & { id?: string }; Update: Partial<PurchaseOrder> };
      expense_categories: { Row: ExpenseCategory; Insert: Partial<ExpenseCategory> & { name: string }; Update: Partial<ExpenseCategory> };
      expenses: { Row: Expense; Insert: Omit<Expense, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Expense> };
      expense_payments: {
        Row: {
          id: string; expense_id: string; payment_date: string; amount: number;
          payment_method: PaymentMethod; reference: string | null; notes: string | null;
          created_at: string; created_by: string | null;
        };
        Insert: { expense_id: string; payment_date: string; amount: number; payment_method?: PaymentMethod; reference?: string | null; notes?: string | null; created_by?: string | null };
        Update: never;
      };
      fixed_costs: { Row: FixedCost; Insert: Omit<FixedCost, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<FixedCost> };
      cost_allocations: { Row: CostAllocation; Insert: Omit<CostAllocation, 'id' | 'created_at'> & { id?: string }; Update: never };
      tasks: { Row: Task; Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Task> };
      invoices: { Row: Invoice; Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'total_excluding_tax' | 'total_vat' | 'total_including_tax'> & { id?: string }; Update: Partial<Invoice> };
      invoice_lines: { Row: InvoiceLine; Insert: Omit<InvoiceLine, 'id'> & { id?: string }; Update: Partial<InvoiceLine> };
      payments: { Row: Payment; Insert: Omit<Payment, 'id' | 'created_at'> & { id?: string }; Update: never };
      documents: { Row: Document; Insert: Omit<Document, 'id' | 'created_at'> & { id?: string }; Update: Partial<Document> };
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'> & { id?: string }; Update: Partial<Notification> };
    };
    Views: {
      v_affair_financials: { Row: AffairFinancials };
      v_dashboard_kpis: { Row: DashboardKpis };
      v_monthly_revenue_expense: { Row: MonthlyRevenueExpense };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
