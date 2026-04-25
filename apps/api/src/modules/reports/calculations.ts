export interface CategoryInfo {
  id: string;
  name: string;
  color: string;
}

export interface CategorySpending {
  categoryId: string | null;
  name: string;
  color: string;
  amount: number;
  /** Share of total spending, as a percentage with one decimal. */
  share: number;
}

const UNCATEGORIZED = { name: 'Uncategorized', color: '#94a3b8' };

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Turns per-category totals into a list sorted from biggest to smallest spend. */
export function categoryBreakdown(
  spending: ReadonlyMap<string | null, number>,
  categories: ReadonlyArray<CategoryInfo>,
): CategorySpending[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const total = [...spending.values()].reduce((sum, v) => sum + v, 0);

  return [...spending.entries()]
    .filter(([, amount]) => amount > 0)
    .map(([categoryId, amount]) => {
      const category = categoryId ? byId.get(categoryId) : undefined;
      return {
        categoryId,
        name: category?.name ?? UNCATEGORIZED.name,
        color: category?.color ?? UNCATEGORIZED.color,
        amount,
        share: total > 0 ? round1((amount / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

/** Percentage of income that was not spent, or null when there was no income. */
export function savingsRate(income: number, expenses: number): number | null {
  if (income <= 0) return null;
  return round1(((income - expenses) / income) * 100);
}

export interface AccountOpening {
  id: string;
  type: string;
  openingBalance: number;
}

export interface MonthlyDelta {
  accountId: string;
  month: string;
  delta: number;
}

export interface NetWorthPoint {
  month: string;
  assets: number;
  /** Money owed, as a positive number. */
  liabilities: number;
  netWorth: number;
}

const LIABILITY_TYPES = new Set(['credit_card', 'loan']);

/**
 * Balance of every account at the end of each month, rolled up into assets,
 * liabilities and net worth. `deltas` must include every month up to the last
 * one requested, including months before the first.
 */
export function netWorthSeries(
  accounts: ReadonlyArray<AccountOpening>,
  deltas: ReadonlyArray<MonthlyDelta>,
  months: ReadonlyArray<string>,
): NetWorthPoint[] {
  return months.map((month) => {
    let assets = 0;
    let liabilities = 0;
    for (const account of accounts) {
      const balance =
        account.openingBalance +
        deltas
          .filter((d) => d.accountId === account.id && d.month <= month)
          .reduce((sum, d) => sum + d.delta, 0);
      if (LIABILITY_TYPES.has(account.type)) liabilities -= balance;
      else assets += balance;
    }
    return { month, assets, liabilities, netWorth: assets - liabilities };
  });
}
