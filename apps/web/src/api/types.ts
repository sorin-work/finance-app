// Shapes returned by the API. Amounts are integer minor units (cents).

export interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  createdAt: string;
}

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'loan';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  balance: number;
  archived: boolean;
  createdAt: string;
}

export type CategoryKind = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  payee: string;
  notes: string;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
