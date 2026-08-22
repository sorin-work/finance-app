import { z } from 'zod';
import { amountCents, id, isoDate } from '../../lib/validation.js';
import { DATE_FORMATS } from './csv-import.js';

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

const fields = {
  accountId: id,
  /** Destination account; only set for transfers. */
  transferAccountId: id.nullable(),
  categoryId: id.nullable(),
  type: z.enum(TRANSACTION_TYPES),
  amount: amountCents,
  date: isoDate,
  payee: z.string().trim().max(200),
  notes: z.string().trim().max(1000),
};

export const createTransactionSchema = z
  .object({
    ...fields,
    transferAccountId: fields.transferAccountId.default(null),
    categoryId: fields.categoryId.default(null),
    payee: fields.payee.default(''),
    notes: fields.notes.default(''),
  })
  .superRefine((tx, ctx) => {
    if (tx.type === 'transfer' && !tx.transferAccountId) {
      ctx.addIssue({
        code: 'custom',
        path: ['transferAccountId'],
        message: 'Transfers need a destination account',
      });
    }
  });

export const updateTransactionSchema = z
  .object(fields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');

export const listTransactionsQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  accountId: id.optional(),
  categoryId: id.optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  /** Case-insensitive search in payee and notes. */
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const exportTransactionsQuery = listTransactionsQuery.omit({ page: true, pageSize: true });

export const payeeSuggestionsQuery = z.object({
  q: z.string().trim().max(100).default(''),
  type: z.enum(['income', 'expense']).optional(),
  limit: z.coerce.number().int().min(1).max(25).default(8),
});

export const importTransactionsSchema = z.object({
  accountId: id,
  csv: z.string().min(1).max(1_500_000, 'The file is too large (1.5 MB max)'),
  dateFormat: z.enum(DATE_FORMATS).default('YMD'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuery>;
export type TransactionFilters = Omit<ListTransactionsQuery, 'page' | 'pageSize'>;
