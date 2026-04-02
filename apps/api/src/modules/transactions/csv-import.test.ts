import { describe, expect, it } from 'vitest';
import { parseImportCsv, parseImportDate } from './csv-import.js';

describe('parseImportDate', () => {
  it('always accepts ISO dates', () => {
    expect(parseImportDate('2026-04-02', 'MDY')).toBe('2026-04-02');
  });

  it('reads month-first and day-first dates', () => {
    expect(parseImportDate('4/2/2026', 'MDY')).toBe('2026-04-02');
    expect(parseImportDate('4/2/2026', 'DMY')).toBe('2026-02-04');
    expect(parseImportDate('31.12.2025', 'DMY')).toBe('2025-12-31');
  });

  it('rejects impossible or ambiguous input', () => {
    expect(parseImportDate('13/01/2026', 'MDY')).toBeNull();
    expect(parseImportDate('02/30/2026', 'MDY')).toBeNull();
    expect(parseImportDate('04/02/2026', 'YMD')).toBeNull();
    expect(parseImportDate('4/2/26', 'MDY')).toBeNull();
  });
});

describe('parseImportCsv', () => {
  it('matches header names case-insensitively and in any order', () => {
    const { rows, problems } = parseImportCsv(
      'MEMO,amount,Transaction Date,Merchant\nlunch,-12.40,2026-04-01,Deli\n',
      'YMD',
    );
    expect(problems).toEqual([]);
    expect(rows).toEqual([
      {
        line: 2,
        date: '2026-04-01',
        amount: -12_40,
        payee: 'Deli',
        notes: 'lunch',
        category: null,
      },
    ]);
  });

  it('combines debit and credit columns', () => {
    const { rows } = parseImportCsv(
      'Date,Description,Debit,Credit\n2026-04-01,Rent,1450.00,\n2026-04-02,Paycheck,,4200.00\n',
      'YMD',
    );
    expect(rows.map((r) => r.amount)).toEqual([-1450_00, 4200_00]);
  });

  it('treats a positive debit the same as a negative one', () => {
    const { rows } = parseImportCsv('Date,Debit\n2026-04-01,-20.00\n', 'YMD');
    expect(rows[0]?.amount).toBe(-20_00);
  });

  it('reads files produced by our own export', () => {
    const exported = [
      'Date,Type,Amount,Account,To account,Category,Payee,Notes',
      '2026-04-01,expense,-54.20,Checking,,Groceries,FreshMart,',
      '2026-04-02,transfer,100.00,Checking,Savings,,,',
    ].join('\r\n');
    const { rows, problems } = parseImportCsv(exported, 'YMD');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: -54_20, category: 'Groceries', payee: 'FreshMart' });
    expect(problems).toEqual([{ line: 3, reason: 'Transfers are not imported' }]);
  });

  it('reports every bad row with its line number', () => {
    const { rows, problems } = parseImportCsv(
      'Date,Amount\n2026-04-01,abc\nnot-a-date,5\n2026-04-03,\n2026-04-04,1.00\n',
      'YMD',
    );
    expect(rows).toHaveLength(1);
    expect(problems.map((p) => p.line)).toEqual([2, 3, 4]);
  });

  it('explains what is missing when the header is wrong', () => {
    expect(parseImportCsv('When,How much\n2026-04-01,5', 'YMD').problems[0]?.reason).toMatch(
      /Missing columns/,
    );
    expect(parseImportCsv('', 'YMD').problems[0]?.reason).toBe('The file is empty');
  });

  it('truncates overly long text fields', () => {
    const long = 'x'.repeat(500);
    const { rows } = parseImportCsv(`Date,Amount,Payee\n2026-04-01,1,${long}\n`, 'YMD');
    expect(rows[0]?.payee).toHaveLength(200);
  });
});
