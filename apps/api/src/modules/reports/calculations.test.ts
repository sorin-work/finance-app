import { describe, expect, it } from 'vitest';
import { categoryBreakdown, netWorthSeries, savingsRate } from './calculations.js';

const categories = [
  { id: 'groceries', name: 'Groceries', color: '#16a34a' },
  { id: 'rent', name: 'Housing', color: '#7c3aed' },
  { id: 'fun', name: 'Entertainment', color: '#ca8a04' },
];

describe('categoryBreakdown', () => {
  it('sorts by amount and computes shares', () => {
    const result = categoryBreakdown(
      new Map([
        ['groceries', 300_00],
        ['rent', 1200_00],
        [null, 100_00],
      ]),
      categories,
    );

    expect(result.map((r) => [r.name, r.amount, r.share])).toEqual([
      ['Housing', 1200_00, 75],
      ['Groceries', 300_00, 18.8],
      ['Uncategorized', 100_00, 6.3],
    ]);
    expect(result[2]?.categoryId).toBeNull();
  });

  it('drops categories with nothing spent', () => {
    expect(categoryBreakdown(new Map([['fun', 0]]), categories)).toEqual([]);
  });

  it('labels categories that no longer exist as uncategorized', () => {
    const [row] = categoryBreakdown(new Map([['deleted-id', 5_00]]), categories);
    expect(row).toMatchObject({ name: 'Uncategorized', share: 100 });
  });
});

describe('savingsRate', () => {
  it('is the share of income left over', () => {
    expect(savingsRate(4000_00, 3000_00)).toBe(25);
    expect(savingsRate(3000_00, 3600_00)).toBe(-20);
  });

  it('is null without income', () => {
    expect(savingsRate(0, 100)).toBeNull();
  });
});

describe('netWorthSeries', () => {
  const accounts = [
    { id: 'checking', type: 'checking', openingBalance: 1000_00 },
    { id: 'card', type: 'credit_card', openingBalance: -200_00 },
  ];

  it('accumulates monthly changes on top of opening balances', () => {
    const deltas = [
      { accountId: 'checking', month: '2026-01', delta: 500_00 },
      { accountId: 'card', month: '2026-01', delta: -300_00 },
      { accountId: 'checking', month: '2026-03', delta: -100_00 },
      { accountId: 'card', month: '2026-03', delta: 300_00 },
    ];
    expect(netWorthSeries(accounts, deltas, ['2026-01', '2026-02', '2026-03'])).toEqual([
      { month: '2026-01', assets: 1500_00, liabilities: 500_00, netWorth: 1000_00 },
      { month: '2026-02', assets: 1500_00, liabilities: 500_00, netWorth: 1000_00 },
      { month: '2026-03', assets: 1400_00, liabilities: 200_00, netWorth: 1200_00 },
    ]);
  });

  it('includes changes from before the first month shown', () => {
    const deltas = [{ accountId: 'checking', month: '2025-06', delta: 50_00 }];
    expect(netWorthSeries(accounts, deltas, ['2026-01'])[0]?.assets).toBe(1050_00);
  });
});
