import { z } from 'zod';
import { signedCents } from '../../lib/validation.js';

export const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'credit_card',
  'cash',
  'investment',
  'loan',
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(ACCOUNT_TYPES),
  openingBalance: signedCents.default(0),
});

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    type: z.enum(ACCOUNT_TYPES),
    openingBalance: signedCents,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
