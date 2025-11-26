import { describe, expect, it } from 'vitest';
import { centsToDecimal, decimalToCents, isValidAmount } from './money.js';

describe('centsToDecimal', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [100, '1.00'],
    [123456, '1234.56'],
    [-5, '-0.05'],
    [-123456, '-1234.56'],
  ])('%i -> %s', (cents, expected) => {
    expect(centsToDecimal(cents)).toBe(expected);
  });
});

describe('decimalToCents', () => {
  it.each([
    ['12', 1200],
    ['12.3', 1230],
    ['12.34', 1234],
    ['0.05', 5],
    ['1,234.56', 123456],
    ['$1,234.56', 123456],
    ['€9.99', 999],
    ['-12.50', -1250],
    ['(12.50)', -1250],
    ['+3', 300],
    ['  7.10  ', 710],
  ])('%s -> %i', (input, expected) => {
    expect(decimalToCents(input)).toBe(expected);
  });

  it.each(['', 'abc', '12.345', '1.2.3', '--5', '12,34.5x'])('rejects %j', (input) => {
    expect(decimalToCents(input)).toBeNull();
  });
});

describe('isValidAmount', () => {
  it('accepts positive integer cents', () => {
    expect(isValidAmount(1)).toBe(true);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER])('rejects %d', (value) => {
    expect(isValidAmount(value)).toBe(false);
  });
});
