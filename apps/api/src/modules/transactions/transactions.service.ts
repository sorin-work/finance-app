import type { Database } from '../../db/types.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { AccountsRepository } from '../accounts/accounts.repository.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import {
  TransactionsRepository,
  toTransaction,
  type Transaction,
} from './transactions.repository.js';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  TransactionType,
  UpdateTransactionInput,
} from './transactions.schemas.js';

export interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

export class TransactionsService {
  private readonly transactions: TransactionsRepository;
  private readonly accounts: AccountsRepository;
  private readonly categories: CategoriesRepository;

  constructor(db: Database) {
    this.transactions = new TransactionsRepository(db);
    this.accounts = new AccountsRepository(db);
    this.categories = new CategoriesRepository(db);
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
    await this.checkReferences(userId, input);
    return toTransaction(await this.transactions.create(userId, input));
  }

  async update(userId: string, id: string, input: UpdateTransactionInput): Promise<Transaction> {
    const existing = await this.transactions.findById(userId, id);
    if (!existing) throw notFound('Transaction');

    await this.checkReferences(userId, {
      accountId: input.accountId ?? existing.account_id,
      categoryId: input.categoryId === undefined ? existing.category_id : input.categoryId,
      type: input.type ?? existing.type,
    });

    const row = await this.transactions.update(userId, id, input);
    if (!row) throw notFound('Transaction');
    return toTransaction(row);
  }

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.transactions.delete(userId, id))) throw notFound('Transaction');
  }

  /** Makes sure the account and category belong to the user and fit the transaction type. */
  private async checkReferences(
    userId: string,
    tx: { accountId: string; categoryId: string | null; type: TransactionType },
  ): Promise<void> {
    if (!(await this.accounts.findById(userId, tx.accountId))) {
      throw badRequest('Unknown account');
    }
    if (tx.categoryId) {
      const category = await this.categories.findById(userId, tx.categoryId);
      if (!category) throw badRequest('Unknown category');
      if (category.kind !== tx.type) {
        throw badRequest(
          `"${category.name}" is an ${category.kind} category and cannot be used for ${tx.type} transactions`,
        );
      }
    }
  }
}
