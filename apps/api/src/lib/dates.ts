/**
 * Calendar date helpers. Dates are plain `YYYY-MM-DD` strings and months are
 * `YYYY-MM` strings; all arithmetic happens in UTC so the server timezone
 * never shifts a date.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isISODate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [, y, mo, d] = m.map(Number) as [number, number, number, number];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

export function isISOMonth(value: string): boolean {
  return ISO_MONTH.test(value);
}

/** Number of days in a month, `month` being 1-12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parts(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return [y, m, d];
}

function format(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function toISODate(date: Date): string {
  return format(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = parts(date);
  return toISODate(new Date(Date.UTC(y, m - 1, d + days)));
}

/** Adds months, clamping to the end of the month: 2024-01-31 + 1 month = 2024-02-29. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = parts(date);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return format(year, month, Math.min(d, daysInMonth(year, month)));
}

/** "2024-03-15" -> "2024-03" */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function currentMonth(now: Date = new Date()): string {
  return monthOf(todayISO(now));
}

export function shiftMonth(month: string, delta: number): string {
  return monthOf(addMonths(`${month}-01`, delta));
}

/** First and last day of a month, both inclusive. */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return { start: format(y, m, 1), end: format(y, m, daysInMonth(y, m)) };
}

/** Months from `from` to `to` inclusive, in order. */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  for (let month = from; month <= to; month = shiftMonth(month, 1)) {
    months.push(month);
  }
  return months;
}
