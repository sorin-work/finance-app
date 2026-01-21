import { describe, expect, it } from 'vitest';
import { categoryBreakdown, savingsRate } from './calculations.js';

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
