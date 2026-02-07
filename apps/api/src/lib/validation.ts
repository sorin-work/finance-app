import { z } from 'zod';
import { isISODate, isISOMonth } from './dates.js';
import { MAX_AMOUNT_CENTS } from './money.js';

export const isoDate = z.string().refine(isISODate, 'Expected a date in YYYY-MM-DD format');

export const isoMonth = z.string().refine(isISOMonth, 'Expected a month in YYYY-MM format');

/** A positive amount in minor units (cents). */
export const amountCents = z
  .number()
  .int('Amounts are integer cents')
  .positive()
  .max(MAX_AMOUNT_CENTS);

/** Any amount in minor units, including zero and negatives (e.g. balances). */
export const signedCents = z
  .number()
  .int('Amounts are integer cents')
  .min(-MAX_AMOUNT_CENTS)
  .max(MAX_AMOUNT_CENTS);

export const id = z.uuid();

export const idParams = z.object({ id });

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a hex color like #1d4ed8');
