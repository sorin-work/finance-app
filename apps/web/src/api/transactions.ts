import { api, toQuery } from './client';
import type { Page, Transaction, TransactionType } from './types';

export interface TransactionFilters {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface TransactionInput {
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  payee: string;
  notes: string;
}

export function fetchTransactions(filters: TransactionFilters): Promise<Page<Transaction>> {
  return api.get<Page<Transaction>>(`/transactions${toQuery({ ...filters })}`);
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  return (await api.post<{ transaction: Transaction }>('/transactions', input)).transaction;
}

export async function updateTransaction(
  id: string,
  input: Partial<TransactionInput>,
): Promise<Transaction> {
  return (await api.patch<{ transaction: Transaction }>(`/transactions/${id}`, input)).transaction;
}

export type DateFormat = 'YMD' | 'MDY' | 'DMY';

export interface ImportResult {
  imported: number;
  skipped: { line: number; reason: string }[];
}

export function importTransactions(input: {
  accountId: string;
  csv: string;
  dateFormat: DateFormat;
}): Promise<ImportResult> {
  return api.post<ImportResult>('/transactions/import', input);
}

/** Download link for a CSV of the transactions matching the filters. */
export function exportUrl(filters: Omit<TransactionFilters, 'page' | 'pageSize'>): string {
  return `/api/transactions/export${toQuery({ ...filters })}`;
}

export function deleteTransaction(id: string): Promise<void> {
  return api.delete(`/transactions/${id}`);
}
