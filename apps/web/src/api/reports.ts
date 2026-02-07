import { api, toQuery } from './client';

export interface CategorySpending {
  categoryId: string | null;
  name: string;
  color: string;
  amount: number;
  share: number;
}

export interface MonthSummary {
  month: string;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number | null;
  byCategory: CategorySpending[];
}

export interface CashflowMonth {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export function fetchSummary(month: string): Promise<MonthSummary> {
  return api.get<MonthSummary>(`/reports/summary${toQuery({ month })}`);
}

export async function fetchCashflow(end: string, months = 12): Promise<CashflowMonth[]> {
  return (
    await api.get<{ months: CashflowMonth[] }>(`/reports/cashflow${toQuery({ end, months })}`)
  ).months;
}
