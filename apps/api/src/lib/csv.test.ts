import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csv.js';

describe('parseCsv', () => {
  it('splits simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles CRLF line endings and a missing final newline', () => {
    expect(parseCsv('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles quoted fields with commas, quotes and newlines', () => {
    expect(parseCsv('"Smith, J","say ""hi""","line 1\nline 2"\n')).toEqual([
      ['Smith, J', 'say "hi"', 'line 1\nline 2'],
    ]);
  });

  it('keeps empty fields', () => {
    expect(parseCsv('a,,c\n,,\n1,2,')).toEqual([
      ['a', '', 'c'],
      ['1', '2', ''],
    ]);
  });

  it('strips a UTF-8 byte order mark', () => {
    expect(parseCsv('\uFEFFDate,Amount\n')[0]?.[0]).toBe('Date');
  });

  it('skips blank lines', () => {
    expect(parseCsv('a\n\n\nb\n')).toEqual([['a'], ['b']]);
  });

  it('treats a quote in the middle of a field as a literal character', () => {
    expect(parseCsv('5" screen,1')).toEqual([['5" screen', '1']]);
  });
});

describe('toCsv', () => {
  it('quotes only when needed and uses CRLF', () => {
    expect(
      toCsv([
        ['plain', 'with,comma', 'with "quote"'],
        [' padded ', 'line\nbreak', 42],
      ]),
    ).toBe('plain,"with,comma","with ""quote"""\r\n" padded ","line\nbreak",42\r\n');
  });

  it('round-trips through parseCsv', () => {
    const rows = [
      ['Date', 'Payee', 'Notes'],
      ['2026-04-01', 'Café "Lumière", Paris', 'two\nlines'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
