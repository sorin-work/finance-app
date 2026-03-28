import { parseCsv } from '../../lib/csv.js';
import { isISODate } from '../../lib/dates.js';
import { decimalToCents } from '../../lib/money.js';

export const DATE_FORMATS = ['YMD', 'MDY', 'DMY'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export interface ImportRow {
  /** 1-based line number in the file, for error messages. */
  line: number;
  date: string;
  /** Signed cents: negative is money out. */
  amount: number;
  payee: string;
  notes: string;
  category: string | null;
}

export interface ImportProblem {
  line: number;
  reason: string;
}

const COLUMN_ALIASES = {
  date: ['date', 'transaction date', 'posted date', 'posting date', 'booking date'],
  amount: ['amount', 'value'],
  debit: ['debit', 'withdrawal', 'money out'],
  credit: ['credit', 'deposit', 'money in'],
  payee: ['payee', 'description', 'merchant', 'name'],
  notes: ['notes', 'memo', 'reference'],
  category: ['category'],
  type: ['type'],
} as const;

type Column = keyof typeof COLUMN_ALIASES;

function findColumns(header: string[]): Partial<Record<Column, number>> {
  const normalized = header.map((h) => h.trim().toLowerCase());
  const columns: Partial<Record<Column, number>> = {};
  for (const [column, aliases] of Object.entries(COLUMN_ALIASES) as [Column, readonly string[]][]) {
    const index = normalized.findIndex((h) => aliases.includes(h));
    if (index !== -1) columns[column] = index;
  }
  return columns;
}

/** Reads a date in ISO format or in the given day/month order. Returns null if invalid. */
export function parseImportDate(value: string, format: DateFormat): string | null {
  const trimmed = value.trim();
  if (isISODate(trimmed)) return trimmed;
  if (format === 'YMD') return null;

  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  if (!match) return null;
  const [first, second, year] = [match[1]!, match[2]!, match[3]!];
  const [month, day] = format === 'MDY' ? [first, second] : [second, first];
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return isISODate(iso) ? iso : null;
}

/**
 * Turns a bank or app CSV export into rows ready to import. Needs a header
 * row with a date column and either an amount column or debit/credit columns.
 */
export function parseImportCsv(
  text: string,
  dateFormat: DateFormat,
): { rows: ImportRow[]; problems: ImportProblem[] } {
  const [header, ...records] = parseCsv(text);
  if (!header) return { rows: [], problems: [{ line: 1, reason: 'The file is empty' }] };

  const columns = findColumns(header);
  const hasAmount = columns.amount !== undefined;
  const hasDebitCredit = columns.debit !== undefined || columns.credit !== undefined;
  if (columns.date === undefined || (!hasAmount && !hasDebitCredit)) {
    return {
      rows: [],
      problems: [
        {
          line: 1,
          reason: 'Missing columns: the header needs a date and an amount (or debit/credit)',
        },
      ],
    };
  }

  const rows: ImportRow[] = [];
  const problems: ImportProblem[] = [];
  const cell = (record: string[], column: Column) => {
    const index = columns[column];
    return index === undefined ? '' : (record[index] ?? '').trim();
  };

  records.forEach((record, i) => {
    const line = i + 2;

    if (cell(record, 'type').toLowerCase() === 'transfer') {
      problems.push({ line, reason: 'Transfers are not imported' });
      return;
    }

    const date = parseImportDate(cell(record, 'date'), dateFormat);
    if (!date) {
      problems.push({ line, reason: `Invalid date "${cell(record, 'date')}"` });
      return;
    }

    let amount: number | null;
    if (hasAmount) {
      amount = decimalToCents(cell(record, 'amount'));
    } else {
      const debit = cell(record, 'debit') ? decimalToCents(cell(record, 'debit')) : 0;
      const credit = cell(record, 'credit') ? decimalToCents(cell(record, 'credit')) : 0;
      amount = debit === null || credit === null ? null : credit - Math.abs(debit);
    }
    if (amount === null || amount === 0) {
      problems.push({ line, reason: 'Missing or invalid amount' });
      return;
    }

    rows.push({
      line,
      date,
      amount,
      payee: cell(record, 'payee').slice(0, 200),
      notes: cell(record, 'notes').slice(0, 1000),
      category: cell(record, 'category') || null,
    });
  });

  return { rows, problems };
}
