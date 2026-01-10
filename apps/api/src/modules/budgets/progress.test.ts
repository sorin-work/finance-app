import { describe, expect, it } from 'vitest';
import { budgetProgress, budgetTotals } from './progress.js';

describe('budgetProgress', () => {
  it('is on track below the warning threshold', () => {
    expect(budgetProgress(100_00, 25_00)).toEqual({
      spent: 25_00,
      remaining: 75_00,
      percent: 25,
      status: 'on_track',
    });
  });

  it('warns from 80% of the budget', () => {
    expect(budgetProgress(100_00, 80_00).status).toBe('warning');
    expect(budgetProgress(100_00, 100_00).status).toBe('warning');
  });

  it('is over once spending exceeds the budget', () => {
    const progress = budgetProgress(100_00, 123_45);
    expect(progress.status).toBe('over');
    expect(progress.remaining).toBe(-23_45);
    expect(progress.percent).toBe(123.5);
  });

  it('handles nothing spent', () => {
    expect(budgetProgress(50_00, 0)).toMatchObject({ percent: 0, status: 'on_track' });
  });

  it('rounds the percentage to one decimal', () => {
    expect(budgetProgress(300, 100).percent).toBe(33.3);
  });
});

describe('budgetTotals', () => {
  it('sums budgets and spending', () => {
    expect(
      budgetTotals([
        { amount: 100_00, spent: 20_00 },
        { amount: 50_00, spent: 75_00 },
      ]),
    ).toEqual({ budgeted: 150_00, spent: 95_00, remaining: 55_00 });
  });

  it('is all zeros for no budgets', () => {
    expect(budgetTotals([])).toEqual({ budgeted: 0, spent: 0, remaining: 0 });
  });
});
