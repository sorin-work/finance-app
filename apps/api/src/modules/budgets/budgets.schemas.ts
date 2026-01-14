import { z } from 'zod';
import { amountCents, id, isoMonth } from '../../lib/validation.js';

export const budgetsQuery = z.object({ month: isoMonth });

export const upsertBudgetSchema = z.object({
  categoryId: id,
  month: isoMonth,
  amount: amountCents,
});

export const copyBudgetsSchema = z
  .object({
    from: isoMonth,
    to: isoMonth,
    /** Replace budgets that already exist in the target month. */
    overwrite: z.boolean().default(false),
  })
  .refine((v) => v.from !== v.to, { message: 'Source and target month must differ', path: ['to'] });

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;
export type CopyBudgetsInput = z.infer<typeof copyBudgetsSchema>;
