// Date/number formatting helpers shared across admin screens.
//
// Dates coming from Supabase `date` columns arrive as 'YYYY-MM-DD' strings.
// We must treat them as local calendar days, never as UTC instants — see the
// toDateOnly() note in ./availability.ts for why. parseDateOnly() builds a
// Date at local midnight so day-of-week and comparisons stay correct.

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const NL_DATE = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const NL_DATE_LONG = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const NL_EURO = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** e.g. "za 12 jul 2026" */
export function formatDateNL(value: string): string {
  return NL_DATE.format(parseDateOnly(value));
}

/** e.g. "zaterdag 12 juli 2026" */
export function formatDateLongNL(value: string): string {
  return NL_DATE_LONG.format(parseDateOnly(value));
}

/** e.g. "€ 1.240" */
export function formatEuro(value: number): string {
  return NL_EURO.format(value);
}
