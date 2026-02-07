export type BudgetStatus = 'on_track' | 'warning' | 'over';

/** Share of the budget at which we start warning the user. */
export const WARNING_THRESHOLD = 0.8;

export interface BudgetProgress {
  spent: number;
  remaining: number;
  /** Spent as a percentage of the budget, rounded to one decimal. Can exceed 100. */
  percent: number;
  status: BudgetStatus;
}

export function budgetProgress(amount: number, spent: number): BudgetProgress {
  const ratio = amount > 0 ? spent / amount : spent > 0 ? Infinity : 0;
  let status: BudgetStatus = 'on_track';
  if (spent > amount) status = 'over';
  else if (ratio >= WARNING_THRESHOLD) status = 'warning';

  return {
    spent,
    remaining: amount - spent,
    percent: Number.isFinite(ratio) ? Math.round(ratio * 1000) / 10 : 100,
    status,
  };
}

export interface BudgetTotals {
  budgeted: number;
  spent: number;
  remaining: number;
}

export function budgetTotals(
  budgets: ReadonlyArray<{ amount: number; spent: number }>,
): BudgetTotals {
  const budgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const spent = budgets.reduce((sum, b) => sum + b.spent, 0);
  return { budgeted, spent, remaining: budgeted - spent };
}
