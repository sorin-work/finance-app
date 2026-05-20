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
 *
 * Accepts an optional leading minus or currency symbol, "." or "," as the
 * decimal separator and thousands separators in either style:
 * "12", "12,50", "-3.20", "1,234.56", "1.234,56", "1 234,56".
 * A single separator followed by exactly three digits ("1,234") is read as a
 * thousands separator. Returns null for anything else.
 */
export function parseMoneyInput(value: string): number | null {
  let text = value.trim().replace(/[\s\u00a0]/g, '');
  const negative = text.startsWith('-');
  if (negative) text = text.slice(1);
  text = text.replace(/^[$€£]/, '');
  if (!/^[\d.,]+$/.test(text)) return null;

  const lastDot = text.lastIndexOf('.');
  const lastComma = text.lastIndexOf(',');
  let decimalIndex = -1;
  if (lastDot !== -1 && lastComma !== -1) {
    decimalIndex = Math.max(lastDot, lastComma);
  } else if (lastDot !== -1 || lastComma !== -1) {
    const index = Math.max(lastDot, lastComma);
    const onlyOne = text.indexOf(text[index]!) === index;
    if (onlyOne && text.length - index - 1 !== 3) decimalIndex = index;
  }

  const whole = decimalIndex === -1 ? text : text.slice(0, decimalIndex);
  const fraction = decimalIndex === -1 ? '' : text.slice(decimalIndex + 1);
  if (decimalIndex !== -1 && !/^\d{1,2}$/.test(fraction)) return null;
  // Either plain digits or groups of three split by one kind of separator.
  if (!/^\d+$/.test(whole) && !/^\d{1,3}([.,])\d{3}(\1\d{3})*$/.test(whole)) return null;

  const cents = Number(whole.replace(/[.,]/g, '')) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
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
