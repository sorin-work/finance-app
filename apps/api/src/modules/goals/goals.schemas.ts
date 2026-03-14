import { z } from 'zod';
import { MAX_AMOUNT_CENTS } from '../../lib/money.js';
import { amountCents, hexColor, isoDate } from '../../lib/validation.js';

export const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetAmount: amountCents,
  savedAmount: z.number().int().min(0).max(MAX_AMOUNT_CENTS).default(0),
  targetDate: isoDate.nullable().default(null),
  color: hexColor.default('#4f46e5'),
});

export const updateGoalSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    targetAmount: amountCents,
    targetDate: isoDate.nullable(),
    color: hexColor,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');

/** Money put into (positive) or taken out of (negative) a goal. */
export const contributionSchema = z.object({
  amount: z
    .number()
    .int('Amounts are integer cents')
    .min(-MAX_AMOUNT_CENTS)
    .max(MAX_AMOUNT_CENTS)
    .refine((v) => v !== 0, 'Amount cannot be zero'),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
