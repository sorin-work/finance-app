import type { Queryable } from '../../db/types.js';
import { setClause } from '../../lib/sql.js';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  TransactionFilters,
  TransactionType,
  UpdateTransactionInput,
} from './transactions.schemas.js';

export interface TransactionRow {
  id: string;
  user_id: string;
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  payee: string;
  notes: string;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  payee: string;
  notes: string;
  createdAt: string;
}

export function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    transferAccountId: row.transfer_account_id,
    categoryId: row.category_id,
    type: row.type,
    amount: row.amount,
    date: row.date,
    payee: row.payee,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
  };
}

/** Escapes LIKE wildcards so user input is matched literally. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** WHERE conditions for the list filters. `alias` prefixes columns when the query joins tables. */
function whereClause(userId: string, filters: TransactionFilters, alias?: string) {
  const col = (name: string) => (alias ? `${alias}.${name}` : name);
  const conditions = [`${col('user_id')} = $1`];
  const params: unknown[] = [userId];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replaceAll('?', `$${params.length}`));
  };

  if (filters.from) add(`${col('date')} >= ?`, filters.from);
  if (filters.to) add(`${col('date')} <= ?`, filters.to);
  if (filters.accountId) {
    add(`(${col('account_id')} = ? OR ${col('transfer_account_id')} = ?)`, filters.accountId);
  }
  if (filters.categoryId) add(`${col('category_id')} = ?`, filters.categoryId);
  if (filters.type) add(`${col('type')} = ?`, filters.type);
  if (filters.q) {
    add(`(${col('payee')} ILIKE ? OR ${col('notes')} ILIKE ?)`, likePattern(filters.q));
  }

  return { sql: conditions.join(' AND '), params };
}

export interface ExportRow {
  date: string;
  type: TransactionType;
  amount: number;
  account: string;
  transfer_account: string | null;
  category: string | null;
  payee: string;
  notes: string;
}

export interface PayeeSuggestion {
  payee: string;
  /** Category used the last time this payee appeared. */
  categoryId: string | null;
  uses: number;
  lastUsed: string;
}

export class TransactionsRepository {
  constructor(private readonly db: Queryable) {}

  async list(
    userId: string,
    query: ListTransactionsQuery,
  ): Promise<{ rows: TransactionRow[]; total: number }> {
    const where = whereClause(userId, query);
    const offset = (query.page - 1) * query.pageSize;

    const [{ rows }, count] = await Promise.all([
      this.db.query<TransactionRow>(
        `SELECT * FROM transactions WHERE ${where.sql}
         ORDER BY date DESC, created_at DESC
         LIMIT $${where.params.length + 1} OFFSET $${where.params.length + 2}`,
        [...where.params, query.pageSize, offset],
      ),
      this.db.query<{ total: number }>(
        `SELECT count(*) AS total FROM transactions WHERE ${where.sql}`,
        where.params,
      ),
    ]);
    return { rows, total: count.rows[0]?.total ?? 0 };
  }

  /** Every matching transaction with account and category names, oldest first. */
  async exportRows(userId: string, filters: TransactionFilters): Promise<ExportRow[]> {
    const where = whereClause(userId, filters, 't');
    const { rows } = await this.db.query<ExportRow>(
      `SELECT t.date, t.type, t.amount, a.name AS account, ta.name AS transfer_account,
              c.name AS category, t.payee, t.notes
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN accounts ta ON ta.id = t.transfer_account_id
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE ${where.sql}
       ORDER BY t.date, t.created_at`,
      where.params,
    );
    return rows;
  }

  /** Payees the user has used before that start with `prefix`, most frequent first. */
  async payeeSuggestions(
    userId: string,
    prefix: string,
    type: TransactionType | undefined,
    limit: number,
  ): Promise<PayeeSuggestion[]> {
    const { rows } = await this.db.query<{
      payee: string;
      category_id: string | null;
      uses: number;
      last_used: string;
    }>(
      `SELECT payee,
              (array_agg(category_id ORDER BY date DESC, created_at DESC))[1] AS category_id,
              count(*) AS uses,
              max(date) AS last_used
       FROM transactions
       WHERE user_id = $1 AND payee <> '' AND payee ILIKE $2
         AND ($3::text IS NULL OR type = $3::text)
       GROUP BY payee
       ORDER BY count(*) DESC, max(date) DESC
       LIMIT $4`,
      [userId, `${prefix.replace(/[\\%_]/g, (c) => `\\${c}`)}%`, type ?? null, limit],
    );
    return rows.map((r) => ({
      payee: r.payee,
      categoryId: r.category_id,
      uses: r.uses,
      lastUsed: r.last_used,
    }));
  }

  /** Total expenses per category between two dates. Uncategorized spending is keyed by null. */
  async spendingByCategory(
    userId: string,
    from: string,
    to: string,
  ): Promise<Map<string | null, number>> {
    const { rows } = await this.db.query<{ category_id: string | null; spent: number }>(
      `SELECT category_id, sum(amount)::bigint AS spent
       FROM transactions
       WHERE user_id = $1 AND type = 'expense' AND date >= $2 AND date <= $3
       GROUP BY category_id`,
      [userId, from, to],
    );
    return new Map(rows.map((r) => [r.category_id, r.spent]));
  }

  async findById(userId: string, id: string): Promise<TransactionRow | null> {
    const { rows } = await this.db.query<TransactionRow>(
      'SELECT * FROM transactions WHERE user_id = $1 AND id = $2',
      [userId, id],
    );
    return rows[0] ?? null;
  }

  async create(userId: string, input: CreateTransactionInput): Promise<TransactionRow> {
    const { rows } = await this.db.query<TransactionRow>(
      `INSERT INTO transactions
         (user_id, account_id, transfer_account_id, category_id, type, amount, date, payee, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        input.accountId,
        input.transferAccountId,
        input.categoryId,
        input.type,
        input.amount,
        input.date,
        input.payee,
        input.notes,
      ],
    );
    return rows[0]!;
  }

  /** Inserts many transactions in one statement. */
  async createMany(userId: string, inputs: CreateTransactionInput[]): Promise<void> {
    if (inputs.length === 0) return;
    const params: unknown[] = [userId];
    const values = inputs.map((input) => {
      params.push(
        input.accountId,
        input.transferAccountId,
        input.categoryId,
        input.type,
        input.amount,
        input.date,
        input.payee,
        input.notes,
      );
      const n = params.length;
      const placeholders = Array.from({ length: 8 }, (_, k) => `$${n - 7 + k}`);
      return `($1, ${placeholders.join(', ')})`;
    });
    await this.db.query(
      `INSERT INTO transactions
         (user_id, account_id, transfer_account_id, category_id, type, amount, date, payee, notes)
       VALUES ${values.join(', ')}`,
      params,
    );
  }

  async update(
    userId: string,
    id: string,
    input: UpdateTransactionInput,
  ): Promise<TransactionRow | null> {
    const set = setClause(
      {
        account_id: input.accountId,
        transfer_account_id: input.transferAccountId,
        category_id: input.categoryId,
        type: input.type,
        amount: input.amount,
        date: input.date,
        payee: input.payee,
        notes: input.notes,
      },
      3,
    );
    const { rows } = await this.db.query<TransactionRow>(
      `UPDATE transactions SET ${set.sql} WHERE user_id = $1 AND id = $2 RETURNING *`,
      [userId, id, ...set.params],
    );
    return rows[0] ?? null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      'DELETE FROM transactions WHERE user_id = $1 AND id = $2',
      [userId, id],
    );
    return rowCount > 0;
  }
}
