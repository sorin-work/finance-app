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

    const type = input.type ?? existing.type;
    // Leaving the transfer type drops the destination account automatically.
    const changes: UpdateTransactionInput =
      type === 'transfer' ? input : { ...input, transferAccountId: null };

    await this.checkReferences(userId, {
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

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.transactions.delete(userId, id))) throw notFound('Transaction');
  }

  /** Makes sure the accounts and category belong to the user and fit the transaction type. */
  private async checkReferences(
    userId: string,
    tx: {
      accountId: string;
      transferAccountId: string | null;
      categoryId: string | null;
      type: TransactionType;
    },
  ): Promise<void> {
    if (!(await this.accounts.findById(userId, tx.accountId))) {
      throw badRequest('Unknown account');
    }
    if (tx.type === 'transfer') {
      if (!tx.transferAccountId) throw badRequest('Transfers need a destination account');
      if (tx.transferAccountId === tx.accountId) {
        throw badRequest('Cannot transfer money to the same account');
      }
      if (!(await this.accounts.findById(userId, tx.transferAccountId))) {
        throw badRequest('Unknown destination account');
      }
      if (tx.categoryId) throw badRequest('Transfers cannot have a category');
      return;
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
