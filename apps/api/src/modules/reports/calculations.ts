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
