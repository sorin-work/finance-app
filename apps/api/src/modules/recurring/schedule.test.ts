import { describe, expect, it } from 'vitest';
import { dueOccurrences, firstOccurrenceOnOrAfter, nextOccurrence } from './schedule.js';

describe('nextOccurrence', () => {
  it.each([
    ['daily', '2026-02-28', '2026-03-01'],
    ['weekly', '2026-02-25', '2026-03-04'],
    ['biweekly', '2026-02-20', '2026-03-06'],
    ['monthly', '2026-01-15', '2026-02-15'],
    ['quarterly', '2026-01-15', '2026-04-15'],
    ['yearly', '2024-02-29', '2025-02-28'],
  ] as const)('%s after %s is %s', (frequency, date, expected) => {
    expect(nextOccurrence(date, frequency)).toBe(expected);
  });
});

describe('dueOccurrences', () => {
  it('lists every occurrence up to and including the cutoff', () => {
    expect(dueOccurrences('2026-01-05', 'monthly', '2026-04-05')).toEqual([
      '2026-01-05',
      '2026-02-05',
      '2026-03-05',
      '2026-04-05',
    ]);
  });

  it('returns nothing when the next occurrence is in the future', () => {
    expect(dueOccurrences('2026-03-10', 'weekly', '2026-03-09')).toEqual([]);
  });

  it('stops at the end date', () => {
    expect(dueOccurrences('2026-01-01', 'weekly', '2026-12-31', { endDate: '2026-01-20' })).toEqual(
      ['2026-01-01', '2026-01-08', '2026-01-15'],
    );
  });

  it('caps the number of occurrences', () => {
    expect(dueOccurrences('2020-01-01', 'daily', '2026-01-01', { limit: 10 })).toHaveLength(10);
  });

  it('keeps month-end schedules on the last day of each month', () => {
    expect(dueOccurrences('2026-01-31', 'monthly', '2026-05-31')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('uses the anchor day when resuming from a clamped date', () => {
    expect(dueOccurrences('2026-02-28', 'monthly', '2026-04-30', { anchorDay: 31 })).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });
});

describe('month-based schedules', () => {
  it('returns to the anchor day after a short month', () => {
    expect(nextOccurrence('2026-02-28', 'monthly', 30)).toBe('2026-03-30');
    expect(nextOccurrence('2026-02-28', 'monthly')).toBe('2026-03-28');
  });

  it('handles quarterly schedules from the 31st', () => {
    expect(nextOccurrence('2026-01-31', 'quarterly')).toBe('2026-04-30');
    expect(nextOccurrence('2026-04-30', 'quarterly', 31)).toBe('2026-07-31');
  });
});

describe('firstOccurrenceOnOrAfter', () => {
  it('skips occurrences before the date', () => {
    expect(firstOccurrenceOnOrAfter('2026-01-03', 'weekly', '2026-01-20')).toBe('2026-01-24');
  });

  it('does not drift for schedules on the 31st', () => {
    expect(firstOccurrenceOnOrAfter('2025-10-31', 'monthly', '2026-03-01')).toBe('2026-03-31');
  });

  it('returns the start when it is already on or after the date', () => {
    expect(firstOccurrenceOnOrAfter('2026-05-01', 'monthly', '2026-03-01')).toBe('2026-05-01');
  });
});
