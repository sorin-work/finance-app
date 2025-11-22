/**
 * Currencies the app can display. All of them use two minor-unit digits,
 * which keeps money handling (integer cents everywhere) simple.
 */
export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'NZD',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'RON',
] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];
