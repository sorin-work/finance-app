import { addDays, addMonths, daysInMonth } from '../../lib/dates.js';

export const FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
] as const;
export type Frequency = (typeof FREQUENCIES)[number];

const MONTHS: Partial<Record<Frequency, number>> = { monthly: 1, quarterly: 3, yearly: 12 };

/** Day of the month a schedule should land on: the day of its start date. */
export function anchorDayOf(startDate: string): number {
  return Number(startDate.slice(8, 10));
}

/**
 * The occurrence after `date`. For month-based schedules `anchorDay` is the
 * day of the month the schedule started on, so a rule starting on the 31st
 * lands on the last day of shorter months and goes back to the 31st after
 * them (Jan 31 -> Feb 28 -> Mar 31) instead of drifting to the 28th.
 */
export function nextOccurrence(date: string, frequency: Frequency, anchorDay?: number): string {
  const months = MONTHS[frequency];
  if (months === undefined) {
    return addDays(date, frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : 14);
  }
  const next = addMonths(`${date.slice(0, 8)}01`, months);
  const [y, m] = next.split('-').map(Number) as [number, number];
  const day = Math.min(anchorDay ?? anchorDayOf(date), daysInMonth(y, m));
  return `${next.slice(0, 8)}${String(day).padStart(2, '0')}`;
}

/** First occurrence of a schedule on or after `date`. */
export function firstOccurrenceOnOrAfter(
  start: string,
  frequency: Frequency,
  date: string,
): string {
  const anchor = anchorDayOf(start);
  let current = start;
  while (current < date) current = nextOccurrence(current, frequency, anchor);
  return current;
}

/**
 * Occurrence dates that are due: from `next` up to and including `until`,
 * stopping at `endDate` when the schedule has one. `limit` guards against
 * generating years of daily entries in one go.
 */
export function dueOccurrences(
  next: string,
  frequency: Frequency,
  until: string,
  options: { endDate?: string | null; anchorDay?: number; limit?: number } = {},
): string[] {
  const { endDate = null, anchorDay = anchorDayOf(next), limit = 366 } = options;
  const dates: string[] = [];
  let current = next;
  while (current <= until && (endDate === null || current <= endDate) && dates.length < limit) {
    dates.push(current);
    current = nextOccurrence(current, frequency, anchorDay);
  }
  return dates;
}
