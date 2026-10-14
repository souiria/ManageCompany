import { format, parseISO } from 'date-fns';

/** Currency: Moroccan dirham (MAD). */
const madFormatter = new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency: 'MAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a numeric amount (as number/string from numeric columns) in MAD. */
export function formatMAD(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(value)) return '—';
  return madFormatter.format(value);
}

/** Format an ISO date / timestamp as DD/MM/YYYY. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd/MM/yyyy');
  } catch {
    return '—';
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd/MM/yyyy HH:mm');
  } catch {
    return '—';
  }
}

/** Convert DD/MM/YYYY (French input) to ISO date string for Postgres. */
export function toISODate(ddmmyyyy: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ddmmyyyy.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}
