import type { Database } from '../../db/types.js';
import { toCsv } from '../../lib/csv.js';
import { notFound } from '../../lib/errors.js';
import { centsToDecimal } from '../../lib/money.js';
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

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.transactions.delete(userId, id))) throw notFound('Transaction');
  }
}
