import { z } from 'zod';
import { amountCents, id, isoDate } from '../../lib/validation.js';
import { TRANSACTION_TYPES } from '../transactions/transactions.schemas.js';
import { FREQUENCIES } from './schedule.js';

const fields = {
  accountId: id,
  transferAccountId: id.nullable(),
  categoryId: id.nullable(),
  type: z.enum(TRANSACTION_TYPES),
  amount: amountCents,
  payee: z.string().trim().max(200),
  notes: z.string().trim().max(1000),
  frequency: z.enum(FREQUENCIES),
  startDate: isoDate,
  endDate: isoDate.nullable(),
  active: z.boolean(),
};

export const createRecurringSchema = z
  .object({
    ...fields,
    transferAccountId: fields.transferAccountId.default(null),
    categoryId: fields.categoryId.default(null),
    payee: fields.payee.default(''),
    notes: fields.notes.default(''),
    endDate: fields.endDate.default(null),
    active: fields.active.default(true),
  })
  .refine((v) => v.endDate === null || v.endDate >= v.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

export const updateRecurringSchema = z
  .object(fields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
