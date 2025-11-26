import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  currentMonth,
  daysInMonth,
  isISODate,
  isISOMonth,
  monthRange,
  monthsBetween,
  shiftMonth,
  todayISO,
} from './dates.js';

describe('isISODate', () => {
  it.each(['2024-01-01', '2024-02-29', '1999-12-31'])('accepts %s', (d) => {
    expect(isISODate(d)).toBe(true);
  });

  it.each(['2023-02-29', '2024-13-01', '2024-00-10', '2024-1-1', '20240101', ''])('rejects %j', (d) => {
    expect(isISODate(d)).toBe(false);
  });
});

describe('isISOMonth', () => {
  it('accepts valid months only', () => {
    expect(isISOMonth('2024-12')).toBe(true);
    expect(isISOMonth('2024-13')).toBe(false);
    expect(isISOMonth('2024-1')).toBe(false);
  });
});

describe('daysInMonth', () => {
  it('handles leap years', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2024-01-31', 1)).toBe('2024-02-01');
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  });
});

describe('addMonths', () => {
  it('clamps to the end of shorter months', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2023-01-31', 1)).toBe('2023-02-28');
    expect(addMonths('2024-03-31', 1)).toBe('2024-04-30');
  });

  it('handles negative offsets and year wrap', () => {
    expect(addMonths('2024-01-15', -1)).toBe('2023-12-15');
    expect(addMonths('2024-11-30', 3)).toBe('2025-02-28');
    expect(addMonths('2024-05-10', -17)).toBe('2022-12-10');
  });
});

describe('months', () => {
  it('shifts months', () => {
    expect(shiftMonth('2024-01', -1)).toBe('2023-12');
    expect(shiftMonth('2024-12', 1)).toBe('2025-01');
  });

  it('builds an inclusive month range', () => {
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(monthRange('2023-04')).toEqual({ start: '2023-04-01', end: '2023-04-30' });
  });

  it('lists months between two months', () => {
    expect(monthsBetween('2023-11', '2024-02')).toEqual(['2023-11', '2023-12', '2024-01', '2024-02']);
    expect(monthsBetween('2024-02', '2024-01')).toEqual([]);
  });

  it('uses UTC for today and the current month', () => {
    const lateEvening = new Date('2024-03-31T23:30:00Z');
    expect(todayISO(lateEvening)).toBe('2024-03-31');
    expect(currentMonth(lateEvening)).toBe('2024-03');
  });
});
