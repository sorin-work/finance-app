import { describe, expect, it } from 'vitest';
import {
  currentMonth,
  formatDate,
  formatMonth,
  formatMonthShort,
  shiftMonth,
  today,
} from './dates';

describe('dates', () => {
  it('uses the local calendar date for today', () => {
    expect(today(new Date(2026, 2, 21, 23, 59))).toBe('2026-03-21');
    expect(currentMonth(new Date(2026, 0, 1))).toBe('2026-01');
  });

  it('shifts months across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
    expect(shiftMonth('2026-03', 12)).toBe('2027-03');
  });

  it('formats dates without timezone surprises', () => {
    expect(formatDate('2026-03-01', 'en-US')).toBe('Mar 1, 2026');
    expect(formatMonth('2026-03', 'en-US')).toBe('March 2026');
  });

  it('adds the year to short month labels from other years', () => {
    const now = new Date(2026, 2, 21);
    expect(formatMonthShort('2026-01', 'en-US', now)).toBe('Jan');
    expect(formatMonthShort('2025-12', 'en-US', now)).toBe('Dec 25');
  });
});
