import { z } from 'zod';
import { amountCents, id, isoDate } from '../../lib/validation.js';

export const TRANSACTION_TYPES = ['income', 'expense'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

const fields = {
  accountId: id,
  categoryId: id.nullable(),
  type: z.enum(TRANSACTION_TYPES),
  amount: amountCents,
  date: isoDate,
  payee: z.string().trim().max(200),
  notes: z.string().trim().max(1000),
};

export const createTransactionSchema = z.object({
  ...fields,
  categoryId: fields.categoryId.default(null),
  payee: fields.payee.default(''),
  notes: fields.notes.default(''),
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
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuery>;
export type TransactionFilters = Omit<ListTransactionsQuery, 'page' | 'pageSize'>;
