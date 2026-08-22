import type { Database } from '../../db/types.js';
import { toCsv } from '../../lib/csv.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { centsToDecimal } from '../../lib/money.js';
import { AccountsRepository } from '../accounts/accounts.repository.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import { parseImportCsv, type DateFormat, type ImportProblem } from './csv-import.js';
import { checkTransactionReferences } from './references.js';
import {
  TransactionsRepository,
  toTransaction,
  type Transaction,
} from './transactions.repository.js';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  TransactionFilters,
  UpdateTransactionInput,
} from './transactions.schemas.js';

export const CSV_HEADER = [
  'Date',
  'Type',
  'Amount',
  'Account',
  'To account',
  'Category',
  'Payee',
  'Notes',
];

export interface ImportResult {
  imported: number;
  skipped: ImportProblem[];
}

export interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

export class TransactionsService {
  private readonly transactions: TransactionsRepository;

  constructor(private readonly db: Database) {
    this.transactions = new TransactionsRepository(db);
  }

  async list(userId: string, query: ListTransactionsQuery): Promise<TransactionPage> {
    const { rows, total } = await this.transactions.list(userId, query);
    return { items: rows.map(toTransaction), total, page: query.page, pageSize: query.pageSize };
  }

  async get(userId: string, id: string): Promise<Transaction> {
    const row = await this.transactions.findById(userId, id);
    if (!row) throw notFound('Transaction');
    return toTransaction(row);
  }

  async create(userId: string, input: CreateTransactionInput): Promise<Transaction> {
    await checkTransactionReferences(this.db, userId, input);
    return toTransaction(await this.transactions.create(userId, input));
  }

  async update(userId: string, id: string, input: UpdateTransactionInput): Promise<Transaction> {
    const existing = await this.transactions.findById(userId, id);
    if (!existing) throw notFound('Transaction');

    const type = input.type ?? existing.type;
    // Leaving the transfer type drops the destination account automatically.
    const changes: UpdateTransactionInput =
      type === 'transfer' ? input : { ...input, transferAccountId: null };

    await checkTransactionReferences(this.db, userId, {
      type,
      accountId: changes.accountId ?? existing.account_id,
      transferAccountId:
        changes.transferAccountId === undefined
          ? existing.transfer_account_id
          : changes.transferAccountId,
      categoryId: changes.categoryId === undefined ? existing.category_id : changes.categoryId,
    });

    const row = await this.transactions.update(userId, id, changes);
    if (!row) throw notFound('Transaction');
    return toTransaction(row);
  }

  /** CSV with one row per transaction. Expenses have negative amounts. */
  async exportCsv(userId: string, filters: TransactionFilters): Promise<string> {
    const rows = await this.transactions.exportRows(userId, filters);
    return toCsv([
      CSV_HEADER,
      ...rows.map((r) => [
        r.date,
        r.type,
        centsToDecimal(r.type === 'expense' ? -r.amount : r.amount),
        r.account,
        r.transfer_account ?? '',
        r.category ?? '',
        r.payee,
        r.notes,
      ]),
    ]);
  }

  /**
   * Imports a CSV into one account. Negative amounts become expenses and
   * positive ones income. Categories are matched by name. Rows that match an
   * existing transaction (same date, amount and payee) are skipped so the same
   * file can be imported twice safely.
   */
  async importCsv(
    userId: string,
    input: { accountId: string; csv: string; dateFormat: DateFormat },
  ): Promise<ImportResult> {
    if (!(await new AccountsRepository(this.db).findById(userId, input.accountId))) {
      throw badRequest('Unknown account');
    }
    const { rows, problems } = parseImportCsv(input.csv, input.dateFormat);
    if (rows.length === 0 && problems.length === 1 && problems[0]!.line === 1) {
      throw badRequest(problems[0]!.reason);
    }

    const categories = await new CategoriesRepository(this.db).list(userId);
    const categoryId = (name: string | null, kind: 'income' | 'expense') =>
      categories.find((c) => c.kind === kind && c.name.toLowerCase() === name?.toLowerCase())?.id ??
      null;

    const key = (date: string, type: string, amount: number, payee: string) =>
      `${date}|${type}|${amount}|${payee.toLowerCase()}`;
    const existing = new Set(
      (await this.transactions.exportRows(userId, { accountId: input.accountId })).map((r) =>
        key(r.date, r.type, r.amount, r.payee),
      ),
    );

    const skipped = [...problems];
    const toInsert: CreateTransactionInput[] = [];
    for (const row of rows) {
      const type = row.amount < 0 ? 'expense' : 'income';
      const amount = Math.abs(row.amount);
      const rowKey = key(row.date, type, amount, row.payee);
      if (existing.has(rowKey)) {
        skipped.push({ line: row.line, reason: 'Already imported' });
        continue;
      }
      existing.add(rowKey);
      toInsert.push({
        accountId: input.accountId,
        transferAccountId: null,
        categoryId: categoryId(row.category, type),
        type,
        amount,
        date: row.date,
        payee: row.payee,
        notes: row.notes,
      });
    }

    await this.db.transaction((tx) => new TransactionsRepository(tx).createMany(userId, toInsert));
    return { imported: toInsert.length, skipped: skipped.sort((a, b) => a.line - b.line) };
  }

  payeeSuggestions(
    userId: string,
    query: { q: string; type?: 'income' | 'expense'; limit: number },
  ) {
    return this.transactions.payeeSuggestions(userId, query.q, query.type, query.limit);
  }

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.transactions.delete(userId, id))) throw notFound('Transaction');
  }
}
