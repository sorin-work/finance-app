import { api } from './client';
import type { TransactionType } from './types';

export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Recurring {
  id: string;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  payee: string;
  notes: string;
  frequency: Frequency;
  startDate: string;
  endDate: string | null;
  nextDate: string;
  active: boolean;
}

export type RecurringInput = Omit<Recurring, 'id' | 'nextDate'>;

export async function fetchRecurring(): Promise<Recurring[]> {
  return (await api.get<{ recurring: Recurring[] }>('/recurring')).recurring;
}

export async function createRecurring(input: RecurringInput): Promise<Recurring> {
  return (await api.post<{ recurring: Recurring }>('/recurring', input)).recurring;
}

export async function updateRecurring(
  id: string,
  input: Partial<RecurringInput>,
): Promise<Recurring> {
  return (await api.patch<{ recurring: Recurring }>(`/recurring/${id}`, input)).recurring;
}

export function deleteRecurring(id: string): Promise<void> {
  return api.delete(`/recurring/${id}`);
}

export function runRecurring(): Promise<{ created: number }> {
  return api.post<{ created: number }>('/recurring/run');
}
