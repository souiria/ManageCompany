/**
 * Pure financial calculations shared by screens, reports and tests.
 * All amounts are decimal-safe: callers pass numbers derived from Postgres
 * `numeric` values (returned as strings by supabase-js — converted via Number).
 *
 * Revenue-recognition rule (documented): recognized revenue = invoiced revenue
 * excluding tax (invoice_lines total), counted ONCE. A purchase order is not
 * revenue; a payment is not revenue. Collected revenue is tracked separately.
 */

export interface AffairTotalsInput {
  /** Sum of invoice_lines HT for invoices not cancelled. */
  invoicedExcludingTax: number;
  /** Sum of approved expenses HT (variable costs). */
  variableCostsExcludingTax: number;
  /** Sum of cost_allocations amounts for the affair (allocated overhead). */
  allocatedFixedCosts: number;
}

export interface AffairTotals {
  totalCost: number;
  grossMargin: number;
  /** Null when revenue is zero — avoids misleading 0% vs NaN. */
  marginPercent: number | null;
}

export function computeAffairTotals(input: AffairTotalsInput): AffairTotals {
  const totalCost = round2(input.variableCostsExcludingTax + input.allocatedFixedCosts);
  const grossMargin = round2(input.invoicedExcludingTax - totalCost);
  const marginPercent =
    input.invoicedExcludingTax === 0
      ? null
      : round2((grossMargin / input.invoicedExcludingTax) * 100);
  return { totalCost, grossMargin, marginPercent };
}

/** VAT: amountExcludingTax × rate% ; TTC = HT + VAT. */
export function computeVat(amountExcludingTax: number, vatRatePercent: number) {
  const vatAmount = round2((amountExcludingTax * vatRatePercent) / 100);
  return {
    vatAmount,
    amountIncludingTax: round2(amountExcludingTax + vatAmount),
  };
}

/** Outstanding balance for an invoice: total TTC minus sum of payments. */
export function computeOutstanding(totalIncludingTax: number, paidAmount: number): number {
  const outstanding = round2(totalIncludingTax - paidAmount);
  return outstanding < 0 ? 0 : outstanding;
}

export function derivePaymentStatus(
  totalIncludingTax: number,
  paidAmount: number,
): 'unpaid' | 'partial' | 'paid' {
  if (paidAmount <= 0) return 'unpaid';
  if (paidAmount >= totalIncludingTax) return 'paid';
  return 'partial';
}

/** Monthly reporting amount for a fixed cost. */
export function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case 'monthly':
      return round2(amount);
    case 'quarterly':
      return round2(amount / 3);
    case 'annually':
      return round2(amount / 12);
    case 'one_time':
      return amount; // counted in its own period, not spread
    default:
      return round2(amount);
  }
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
