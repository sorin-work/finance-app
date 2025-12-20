import { api } from './client';
import type { Account, AccountType } from './types';

export interface AccountInput {
  name: string;
  type: AccountType;
  openingBalance: number;
}

export async function fetchAccounts(): Promise<Account[]> {
  return (await api.get<{ accounts: Account[] }>('/accounts')).accounts;
}

export async function createAccount(input: AccountInput): Promise<Account> {
  return (await api.post<{ account: Account }>('/accounts', input)).account;
}

export async function updateAccount(id: string, input: Partial<AccountInput>): Promise<Account> {
  return (await api.patch<{ account: Account }>(`/accounts/${id}`, input)).account;
}

export function deleteAccount(id: string): Promise<void> {
  return api.delete(`/accounts/${id}`);
}
