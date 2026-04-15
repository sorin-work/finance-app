import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../lib/currencies.js';

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    currency: z.enum(SUPPORTED_CURRENCIES),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
