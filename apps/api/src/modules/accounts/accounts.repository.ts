import type { Queryable } from '../../db/types.js';
import { setClause } from '../../lib/sql.js';
import type { AccountType, CreateAccountInput, UpdateAccountInput } from './accounts.schemas.js';

export interface AccountRow {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  created_at: Date;
  updated_at: Date;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  balance: number;
  createdAt: string;
}

export function toAccount(row: AccountRow, balance = row.opening_balance): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    openingBalance: row.opening_balance,
    balance,
    createdAt: row.created_at.toISOString(),
  };
}

export class AccountsRepository {
  constructor(private readonly db: Queryable) {}

  async list(userId: string): Promise<AccountRow[]> {
    const { rows } = await this.db.query<AccountRow>(
      'SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at, name',
      [userId],
    );
    return rows;
  }

  async findById(userId: string, id: string): Promise<AccountRow | null> {
    const { rows } = await this.db.query<AccountRow>(
      'SELECT * FROM accounts WHERE user_id = $1 AND id = $2',
      [userId, id],
    );
    return rows[0] ?? null;
  }

  async create(userId: string, input: CreateAccountInput): Promise<AccountRow> {
    const { rows } = await this.db.query<AccountRow>(
      `INSERT INTO accounts (user_id, name, type, opening_balance)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, input.name, input.type, input.openingBalance],
    );
    return rows[0]!;
  }

  async update(userId: string, id: string, input: UpdateAccountInput): Promise<AccountRow | null> {
    const set = setClause(
      { name: input.name, type: input.type, opening_balance: input.openingBalance },
      3,
    );
    const { rows } = await this.db.query<AccountRow>(
      `UPDATE accounts SET ${set.sql} WHERE user_id = $1 AND id = $2 RETURNING *`,
      [userId, id, ...set.params],
    );
    return rows[0] ?? null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query('DELETE FROM accounts WHERE user_id = $1 AND id = $2', [
      userId,
      id,
    ]);
    return rowCount > 0;
  }
}
