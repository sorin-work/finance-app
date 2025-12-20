import type { AccountType } from '../api/types';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit card',
  cash: 'Cash',
  investment: 'Investment',
  loan: 'Loan',
};

export const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[];

/** Accounts that represent money owed rather than money held. */
export function isLiability(type: AccountType): boolean {
  return type === 'credit_card' || type === 'loan';
}
