/** Formats integer cents as a currency string, e.g. 123456 -> "$1,234.56". */
export function formatMoney(
  cents: number,
  currency: string,
  options: { signDisplay?: 'auto' | 'always' | 'exceptZero'; locale?: string } = {},
): string {
  return new Intl.NumberFormat(options.locale, {
    style: 'currency',
    currency,
    signDisplay: options.signDisplay ?? 'auto',
  }).format(cents / 100);
}

/**
 * Parses what a user typed into an amount field into cents.
 * Accepts an optional leading minus and either "." or "," as the decimal
 * separator: "12", "12.5", "12,50", "-3.20". Returns null for anything else.
 */
export function parseMoneyInput(value: string): number | null {
  const match = /^(-)?(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const [, minus, major, minor = ''] = match;
  const cents = Number(major) * 100 + Number(minor.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return minus ? -cents : cents;
}

/** The value to prefill an amount input with: 123456 -> "1234.56". */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Short labels for chart axes: 1250000 -> "$12.5K". */
export function formatCompactMoney(cents: number, currency: string, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100);
}
