import type { Queryable } from '../../db/types.js';
import { setClause } from '../../lib/sql.js';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  currency: string;
  created_at: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  createdAt: string;
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    currency: row.currency,
    createdAt: row.created_at.toISOString(),
  };
}

export class UsersRepository {
  constructor(private readonly db: Queryable) {}

  async findById(id: string): Promise<UserRow | null> {
    const { rows } = await this.db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const { rows } = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE lower(email) = lower($1)',
      [email],
    );
    return rows[0] ?? null;
  }

  async update(id: string, input: { name?: string; currency?: string }): Promise<UserRow | null> {
    const set = setClause({ name: input.name, currency: input.currency }, 2);
    const { rows } = await this.db.query<UserRow>(
      `UPDATE users SET ${set.sql} WHERE id = $1 RETURNING *`,
      [id, ...set.params],
    );
    return rows[0] ?? null;
  }

  async setPasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db.query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [
      id,
      passwordHash,
    ]);
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM users WHERE id = $1', [id]);
  }

  async create(input: {
    email: string;
    name: string;
    passwordHash: string;
    currency: string;
  }): Promise<UserRow> {
    const { rows } = await this.db.query<UserRow>(
      `INSERT INTO users (email, name, password_hash, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.email, input.name, input.passwordHash, input.currency],
    );
    return rows[0]!;
  }
}
