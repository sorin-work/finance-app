import { z } from 'zod';
import { amountCents, id, isoMonth } from '../../lib/validation.js';

export const budgetsQuery = z.object({ month: isoMonth });

export const upsertBudgetSchema = z.object({
  categoryId: id,
  month: isoMonth,
  amount: amountCents,
});

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;
