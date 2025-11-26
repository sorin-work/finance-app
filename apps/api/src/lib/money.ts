/**
 * Money is always handled as an integer number of minor units (cents).
 * These helpers convert between cents and the decimal strings used in CSV files.
 */

/** Largest amount accepted for a single value: 1 trillion in major units. */
export const MAX_AMOUNT_CENTS = 100_000_000_000_000;

export function isValidAmount(cents: number): boolean {
  return Number.isSafeInteger(cents) && cents > 0 && cents <= MAX_AMOUNT_CENTS;
}

/** 123456 -> "1234.56", -5 -> "-0.05" */
export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const major = Math.floor(abs / 100);
  const minor = String(abs % 100).padStart(2, '0');
  return `${sign}${major}.${minor}`;
}

/**
 * Parses a human-entered decimal amount into cents.
 * Accepts thousands separators, a leading currency symbol, a leading minus
 * sign and accounting-style parentheses for negatives: "(1,234.50)" -> -123450.
 * Returns null when the value is not a valid amount.
 */
export function decimalToCents(input: string): number | null {
  let value = input.trim();
  if (value === '') return null;

  let negative = false;
  if (value.startsWith('(') && value.endsWith(')')) {
    negative = true;
    value = value.slice(1, -1).trim();
  }
  if (value.startsWith('-')) {
    negative = !negative;
    value = value.slice(1).trim();
  } else if (value.startsWith('+')) {
    value = value.slice(1).trim();
  }
  value = value.replace(/^[$€£]/, '').replace(/,/g, '');

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;

  const major = Number(match[1]);
  const minor = Number((match[2] ?? '').padEnd(2, '0'));
  const cents = major * 100 + minor;
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}
