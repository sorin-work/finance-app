import type { Database } from '../../db/types.js';
import { notFound } from '../../lib/errors.js';
import { AccountsRepository, toAccount, type Account } from './accounts.repository.js';
import type { CreateAccountInput, UpdateAccountInput } from './accounts.schemas.js';

export class AccountsService {
  private readonly accounts: AccountsRepository;

  constructor(db: Database) {
    this.accounts = new AccountsRepository(db);
  }

  async list(userId: string): Promise<Account[]> {
    const rows = await this.accounts.list(userId);
    return rows.map((row) => toAccount(row));
  }

  async get(userId: string, id: string): Promise<Account> {
    const row = await this.accounts.findById(userId, id);
    if (!row) throw notFound('Account');
    return toAccount(row);
  }

  async create(userId: string, input: CreateAccountInput): Promise<Account> {
    return toAccount(await this.accounts.create(userId, input));
  }

  async update(userId: string, id: string, input: UpdateAccountInput): Promise<Account> {
    const row = await this.accounts.update(userId, id, input);
    if (!row) throw notFound('Account');
    return toAccount(row);
  }

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.accounts.delete(userId, id))) throw notFound('Account');
  }
}
