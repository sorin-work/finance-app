import { z } from 'zod';
import { hexColor } from '../../lib/validation.js';

export const CATEGORY_KINDS = ['income', 'expense'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  kind: z.enum(CATEGORY_KINDS),
  color: hexColor.default('#64748b'),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    color: hexColor,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
