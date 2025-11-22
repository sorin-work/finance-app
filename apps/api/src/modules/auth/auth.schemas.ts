import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../lib/currencies.js';

export const registerSchema = z.object({
  email: z.email().max(254).transform((v) => v.trim()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().trim().min(1).max(100),
  currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
