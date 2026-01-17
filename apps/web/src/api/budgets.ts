import { api } from './client';

export type BudgetStatus = 'on_track' | 'warning' | 'over';

export interface Budget {
  id: string;
  categoryId: string;
  month: string;
  amount: number;
  spent: number;
  remaining: number;
  percent: number;
  status: BudgetStatus;
}

export interface MonthBudgets {
  month: string;
  totals: { budgeted: number; spent: number; remaining: number };
  budgets: Budget[];
}

export function fetchBudgets(month: string): Promise<MonthBudgets> {
  return api.get<MonthBudgets>(`/budgets?month=${month}`);
}

export function saveBudget(input: { categoryId: string; month: string; amount: number }) {
  return api.put<{ budget: Budget }>('/budgets', input);
}

export function copyBudgets(from: string, to: string): Promise<{ copied: number }> {
  return api.post<{ copied: number }>('/budgets/copy', { from, to });
}

export function deleteBudget(id: string): Promise<void> {
  return api.delete(`/budgets/${id}`);
}
