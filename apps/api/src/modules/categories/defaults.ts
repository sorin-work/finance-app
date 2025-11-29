import type { CategoryKind } from './categories.schemas.js';

/** Categories every new user starts with. They can be renamed or deleted later. */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; kind: CategoryKind; color: string }> = [
  { name: 'Salary', kind: 'income', color: '#15803d' },
  { name: 'Freelance', kind: 'income', color: '#0369a1' },
  { name: 'Interest & Dividends', kind: 'income', color: '#a16207' },
  { name: 'Other Income', kind: 'income', color: '#475569' },
  { name: 'Groceries', kind: 'expense', color: '#16a34a' },
  { name: 'Housing', kind: 'expense', color: '#7c3aed' },
  { name: 'Utilities', kind: 'expense', color: '#0891b2' },
  { name: 'Transport', kind: 'expense', color: '#ea580c' },
  { name: 'Dining Out', kind: 'expense', color: '#db2777' },
  { name: 'Health', kind: 'expense', color: '#dc2626' },
  { name: 'Entertainment', kind: 'expense', color: '#ca8a04' },
  { name: 'Shopping', kind: 'expense', color: '#2563eb' },
  { name: 'Subscriptions', kind: 'expense', color: '#4f46e5' },
  { name: 'Travel', kind: 'expense', color: '#0d9488' },
  { name: 'Other', kind: 'expense', color: '#64748b' },
];
