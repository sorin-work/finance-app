import { describe, expect, it } from 'vitest';
import { centsToInput, formatCompactMoney, formatMoney, parseMoneyInput } from './money';

describe('formatMoney', () => {
  it('formats cents in the given currency', () => {
    expect(formatMoney(123456, 'USD', { locale: 'en-US' })).toBe('$1,234.56');
    expect(formatMoney(-5, 'USD', { locale: 'en-US' })).toBe('-$0.05');
    expect(formatMoney(1999, 'EUR', { locale: 'de-DE' })).toBe('19,99 €');
  });

  it('can always show the sign', () => {
    expect(formatMoney(2500, 'USD', { locale: 'en-US', signDisplay: 'always' })).toBe('+$25.00');
  });
});

describe('formatCompactMoney', () => {
  it('shortens large amounts', () => {
    expect(formatCompactMoney(1_250_000, 'USD', 'en-US')).toBe('$12.5K');
  });
});

describe('parseMoneyInput', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['12,50', 1250],
    ['0.01', 1],
    ['-3.20', -320],
    [' 7 ', 700],
    ['1,234.56', 123456],
    ['1.234,56', 123456],
    ['1 234,56', 123456],
    ['1,234', 123400],
    ['12,345,678.9', 1234567890],
    ['$5', 500],
    ['-€9,99', -999],
  ])('%j -> %i', (input, cents) => {
    expect(parseMoneyInput(input)).toBe(cents);
  });

  it.each(['', 'abc', '12.', '.5', '--1', '1,23,456', '1.2.3', '1,2345', '12.345,6.7'])(
    'rejects %j',
    (input) => {
      expect(parseMoneyInput(input)).toBeNull();
    },
  );
});

describe('centsToInput', () => {
  it('produces a value parseMoneyInput accepts', () => {
    for (const cents of [0, 5, 1250, -320, 123456]) {
      expect(parseMoneyInput(centsToInput(cents))).toBe(cents);
    }
  });
});
