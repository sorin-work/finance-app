import { addDays, addMonths } from '../../lib/dates.js';

export const FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

/** The occurrence after `date`. */
export function nextOccurrence(date: string, frequency: Frequency): string {
  switch (frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addDays(date, 7);
    case 'biweekly':
      return addDays(date, 14);
    case 'monthly':
      return addMonths(date, 1);
    case 'quarterly':
      return addMonths(date, 3);
    case 'yearly':
      return addMonths(date, 12);
  }
}

/** First occurrence of a schedule on or after `date`. */
export function firstOccurrenceOnOrAfter(start: string, frequency: Frequency, date: string): string {
  let current = start;
  while (current < date) current = nextOccurrence(current, frequency);
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
  endDate: string | null = null,
  limit = 366,
): string[] {
  const dates: string[] = [];
  let current = next;
  while (current <= until && (endDate === null || current <= endDate) && dates.length < limit) {
    dates.push(current);
    current = nextOccurrence(current, frequency);
  }
  return dates;
}
