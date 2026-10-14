// Controlled vocabularies mirrored from the database enums / reference tables.
// Labels are French per the project requirements.

export const USER_ROLES = ['admin', 'manager', 'accountant', 'employee'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const AFFAIR_STATUSES = [
  'draft',
  'in_progress',
  'partially_delivered',
  'delivered',
  'invoiced',
  'closed',
  'cancelled',
] as const;
export type AffairStatus = (typeof AFFAIR_STATUSES)[number];

export const AFFAIR_STATUS_LABELS: Record<AffairStatus, string> = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  partially_delivered: 'Partiellement livré',
  delivered: 'Livré',
  invoiced: 'Facturé',
  closed: 'Clôturé',
  cancelled: 'Annulé',
};

export const ORDER_TYPES = ['purchase_order', 'public_contract', 'private_contract'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  purchase_order: 'Bon de commande',
  public_contract: 'Marché public',
  private_contract: 'Contrat privé',
};

export const CUSTOMER_TYPES = ['public', 'private'] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Non payé',
  partial: 'Partiellement payé',
  paid: 'Payé',
};

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
};

export const PAYMENT_METHODS = [
  'cash',
  'bank_transfer',
  'cheque',
  'credit_card',
  'other',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  bank_transfer: 'Virement bancaire',
  cheque: 'Chèque',
  credit_card: 'Carte bancaire',
  other: 'Autre',
};

export const TASK_STATUSES = ['planned', 'in_progress', 'done', 'blocked'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  planned: 'Planifiée',
  in_progress: 'En cours',
  done: 'Terminée',
  blocked: 'Bloquée',
};

export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

export const INVOICE_STATUSES = ['draft', 'sent', 'partially_paid', 'paid', 'cancelled'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  partially_paid: 'Partiellement payée',
  paid: 'Payée',
  cancelled: 'Annulée',
};

export const FIXED_COST_FREQUENCIES = ['monthly', 'quarterly', 'annually', 'one_time'] as const;
export type FixedCostFrequency = (typeof FIXED_COST_FREQUENCIES)[number];

export const FIXED_COST_FREQUENCY_LABELS: Record<FixedCostFrequency, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  annually: 'Annuel',
  one_time: 'Ponctuel',
};

export const ALLOCATION_METHODS = [
  'percentage',
  'equal',
  'revenue_proportional',
  'manual',
] as const;
export type AllocationMethod = (typeof ALLOCATION_METHODS)[number];

export const ALLOCATION_METHOD_LABELS: Record<AllocationMethod, string> = {
  percentage: 'Par pourcentage',
  equal: 'Répartition égale',
  revenue_proportional: 'Au prorata du CA',
  manual: 'Manuel',
};

export const DOCUMENT_TYPES = [
  'purchase_order',
  'quotation',
  'invoice',
  'delivery_note',
  'expense_receipt',
  'contract',
  'other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  purchase_order: 'Bon de commande',
  quotation: 'Devis',
  invoice: 'Facture',
  delivery_note: 'Bon de livraison',
  expense_receipt: 'Pièce de dépense',
  contract: 'Contrat',
  other: 'Autre',
};

/** Overdue is computed, not stored: a planned/in-progress affair past its delivery date. */
export function isAffairOverdue(
  status: AffairStatus,
  plannedDeliveryDate: string | null,
  today: Date = new Date(),
): boolean {
  if (!plannedDeliveryDate) return false;
  if (status === 'closed' || status === 'cancelled' || status === 'invoiced') return false;
  return new Date(plannedDeliveryDate) < today;
}

export function isTaskOverdue(
  status: TaskStatus,
  plannedDate: string | null,
  today: Date = new Date(),
): boolean {
  if (!plannedDate) return false;
  if (status === 'done') return false;
  return new Date(plannedDate) < today;
}
