import { z } from 'zod';
import { toISODate } from '@/lib/format';

// ---------- helpers ----------
const madAmount = z
  .number({ invalid_type_error: 'Montant requis' })
  .min(0, 'Le montant ne peut pas être négatif')
  .max(999999999999, 'Montant trop élevé');

const vatRate = z.number().min(0).max(100);

const isoDateString = (label: string) =>
  z
    .string()
    .min(1, `${label} requis`)
    .refine((v) => toISODate(v) !== null, `${label} au format JJ/MM/AAAA`);

const optionalIsoDate = z
  .string()
  .refine((v) => v === '' || toISODate(v) !== null, 'Date au format JJ/MM/AAAA')
  .optional()
  .or(z.literal(''));

const optionalTrimmed = z.string().trim().optional().or(z.literal(''));

// ---------- auth ----------
export const loginSchema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide'),
  password: z.string().min(6, 'Mot de passe : 6 caractères minimum'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const supabaseConfigSchema = z.object({
  url: z.string().trim().url('URL invalide (https://…supabase.co)'),
  anonKey: z.string().trim().min(20, 'Clé anon invalide'),
});
export type SupabaseConfigInput = z.infer<typeof supabaseConfigSchema>;

// ---------- customers ----------
export const customerSchema = z.object({
  company_name: z.string().trim().min(2, 'Raison sociale requise'),
  ice: z.string().trim().regex(/^\d{15}$/, 'ICE : 15 chiffres').optional().or(z.literal('')),
  customer_type: z.enum(['public', 'private']),
  address: optionalTrimmed,
  phone: optionalTrimmed,
  email: optionalTrimmed.refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail invalide'),
  notes: optionalTrimmed,
});
export type CustomerInput = z.infer<typeof customerSchema>;

// ---------- suppliers ----------
export const supplierSchema = z.object({
  company_name: z.string().trim().min(2, 'Raison sociale requise'),
  ice: z.string().trim().regex(/^\d{15}$/, 'ICE : 15 chiffres').optional().or(z.literal('')),
  specialty: optionalTrimmed,
  contact_person: optionalTrimmed,
  phone: optionalTrimmed,
  email: optionalTrimmed.refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail invalide'),
  address: optionalTrimmed,
  notes: optionalTrimmed,
});
export type SupplierInput = z.infer<typeof supplierSchema>;

// ---------- affairs ----------
export const affairSchema = z.object({
  customer_id: z.string().uuid('Client requis'),
  description: optionalTrimmed,
  order_type: z.enum(['purchase_order', 'public_contract', 'private_contract']),
  buyer: optionalTrimmed,
  requester: optionalTrimmed,
  customer_contact_info: optionalTrimmed,
  order_date: optionalIsoDate,
  planned_delivery_date: optionalIsoDate,
  actual_delivery_date: optionalIsoDate,
  responsible_id: optionalTrimmed,
  odoo_quote_ref: optionalTrimmed,
  notes: optionalTrimmed,
});
export type AffairInput = z.infer<typeof affairSchema>;

export const purchaseOrderSchema = z
  .object({
    po_number: z.string().trim().min(1, 'N° de bon de commande requis'),
    description: optionalTrimmed,
    amount_excluding_tax: madAmount,
    vat_rate: vatRate,
    order_date: optionalIsoDate,
    planned_delivery_date: optionalIsoDate,
    status: z.enum(['draft', 'in_progress', 'partially_delivered', 'delivered', 'invoiced', 'closed', 'cancelled']),
  })
  .refine(
    (v) =>
      !v.planned_delivery_date ||
      !v.order_date ||
      toISODate(v.planned_delivery_date)! >= toISODate(v.order_date)!,
    { message: 'La livraison planifiée ne peut précéder la commande', path: ['planned_delivery_date'] },
  );
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

// ---------- expenses ----------
export const expenseSchema = z.object({
  expense_date: isoDateString('Date de dépense'),
  affair_id: optionalTrimmed,
  supplier_id: optionalTrimmed,
  description: z.string().trim().min(3, 'Description requise'),
  category_id: optionalTrimmed,
  classification: z.enum(['fixed', 'variable']),
  amount_excluding_tax: madAmount,
  vat_rate: vatRate,
  payment_method: z.enum(['cash', 'bank_transfer', 'cheque', 'credit_card', 'other']).optional().or(z.literal('')),
  receipt_ref: optionalTrimmed,
  notes: optionalTrimmed,
});
export type ExpenseFormInput = z.infer<typeof expenseSchema>;

// ---------- fixed costs ----------
export const fixedCostSchema = z.object({
  description: z.string().trim().min(2, 'Description requise'),
  category: optionalTrimmed,
  amount: madAmount,
  frequency: z.enum(['monthly', 'quarterly', 'annually', 'one_time']),
  start_date: optionalIsoDate,
  end_date: optionalIsoDate,
  allocation_method: z.enum(['percentage', 'equal', 'revenue_proportional', 'manual']),
  notes: optionalTrimmed,
});
export type FixedCostInput = z.infer<typeof fixedCostSchema>;

export const allocationSchema = z.object({
  fixed_cost_id: z.string().uuid('Charge fixe requise'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Période au format AAAA-MM'),
  affair_id: z.string().uuid('Affaire requise'),
  allocation_percent: z.number().gt(0, 'Pourcentage > 0').max(100, 'Maximum 100 %'),
});
export type AllocationInput = z.infer<typeof allocationSchema>;

// ---------- tasks ----------
export const taskSchema = z.object({
  title: z.string().trim().min(2, 'Titre requis'),
  description: optionalTrimmed,
  affair_id: optionalTrimmed,
  assigned_to: optionalTrimmed,
  planned_date: optionalIsoDate,
  priority: z.enum(['high', 'medium', 'low']),
  notes: optionalTrimmed,
});
export type TaskInput = z.infer<typeof taskSchema>;

// ---------- invoices ----------
export const invoiceLineSchema = z.object({
  description: z.string().trim().min(1, 'Désignation requise'),
  quantity: z.number().positive('Quantité > 0'),
  unit_price: madAmount,
  vat_rate: vatRate,
});
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

export const invoiceSchema = z.object({
  invoice_number: z.string().trim().min(1, 'N° de facture requis'),
  customer_id: z.string().uuid('Client requis'),
  affair_id: optionalTrimmed,
  issue_date: isoDateString('Date d’émission'),
  due_date: optionalIsoDate,
  notes: optionalTrimmed,
  lines: z.array(invoiceLineSchema).min(1, 'Au moins une ligne de facture'),
});
export type InvoiceFormInput = z.infer<typeof invoiceSchema>;

export const paymentSchema = z.object({
  payment_date: isoDateString('Date de paiement'),
  amount: z.number().positive('Montant > 0'),
  payment_method: z.enum(['cash', 'bank_transfer', 'cheque', 'credit_card', 'other']),
  transaction_ref: optionalTrimmed,
  notes: optionalTrimmed,
});
export type PaymentInput = z.infer<typeof paymentSchema>;
