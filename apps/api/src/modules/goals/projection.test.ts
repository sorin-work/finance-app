import { describe, expect, it } from 'vitest';
import { goalProjection } from './projection.js';

const goal = (savedAmount: number, targetDate: string | null, targetAmount = 1200_00) => ({
  targetAmount,
  savedAmount,
  targetDate,
});

describe('goalProjection', () => {
  it('spreads what is left over the remaining months', () => {
    expect(goalProjection(goal(0, '2026-12-15'), '2026-03-15')).toEqual({
      remaining: 1200_00,
      monthsLeft: 9,
      monthlyNeeded: 133_34,
      overdue: false,
    });
  });

  it('does not count a month that has not fully passed', () => {
    expect(goalProjection(goal(0, '2026-06-10'), '2026-03-20').monthsLeft).toBe(2);
  });

  it('asks for everything when less than a month is left', () => {
    expect(goalProjection(goal(200_00, '2026-03-30'), '2026-03-20')).toMatchObject({
      monthsLeft: 1,
      monthlyNeeded: 1000_00,
    });
  });

  it('flags goals whose date has passed', () => {
    expect(goalProjection(goal(0, '2026-01-01'), '2026-03-20')).toMatchObject({
      overdue: true,
      monthlyNeeded: null,
    });
  });

  it('needs nothing once the goal is reached', () => {
    expect(goalProjection(goal(1500_00, '2026-01-01'), '2026-03-20')).toEqual({
      remaining: 0,
      monthsLeft: null,
      monthlyNeeded: null,
      overdue: false,
    });
  });

  it('has no monthly figure without a target date', () => {
    expect(goalProjection(goal(100, null), '2026-03-20').monthlyNeeded).toBeNull();
  });
});
