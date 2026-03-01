import type { Queryable } from '../../db/types.js';
import { setClause } from '../../lib/sql.js';
import type { TransactionType } from '../transactions/transactions.schemas.js';
import type { UpdateRecurringInput } from './recurring.schemas.js';
import type { Frequency } from './schedule.js';

export interface RecurringRow {
  id: string;
  user_id: string;
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  payee: string;
  notes: string;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  next_date: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Recurring {
  id: string;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  payee: string;
  notes: string;
  frequency: Frequency;
  startDate: string;
  endDate: string | null;
  nextDate: string;
  active: boolean;
}

export function toRecurring(row: RecurringRow): Recurring {
  return {
    id: row.id,
    accountId: row.account_id,
    transferAccountId: row.transfer_account_id,
    categoryId: row.category_id,
    type: row.type,
    amount: row.amount,
    payee: row.payee,
    notes: row.notes,
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date,
    nextDate: row.next_date,
    active: row.active,
  };
}

export type RecurringValues = Omit<Recurring, 'id'>;

export class RecurringRepository {
  constructor(private readonly db: Queryable) {}

  async list(userId: string): Promise<RecurringRow[]> {
    const { rows } = await this.db.query<RecurringRow>(
      `SELECT * FROM recurring_transactions
       WHERE user_id = $1
       ORDER BY active DESC, next_date, lower(payee)`,
      [userId],
    );
    return rows;
  }

  async findById(userId: string, id: string): Promise<RecurringRow | null> {
    const { rows } = await this.db.query<RecurringRow>(
      'SELECT * FROM recurring_transactions WHERE user_id = $1 AND id = $2',
      [userId, id],
    );
    return rows[0] ?? null;
  }

  async create(userId: string, values: RecurringValues): Promise<RecurringRow> {
    const { rows } = await this.db.query<RecurringRow>(
      `INSERT INTO recurring_transactions
         (user_id, account_id, transfer_account_id, category_id, type, amount, payee, notes,
          frequency, start_date, end_date, next_date, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        userId,
        values.accountId,
        values.transferAccountId,
        values.categoryId,
        values.type,
        values.amount,
        values.payee,
        values.notes,
        values.frequency,
        values.startDate,
        values.endDate,
        values.nextDate,
        values.active,
      ],
    );
    return rows[0]!;
  }

  async update(
    userId: string,
    id: string,
    input: UpdateRecurringInput & { nextDate?: string },
  ): Promise<RecurringRow | null> {
    const set = setClause(
      {
        account_id: input.accountId,
        transfer_account_id: input.transferAccountId,
        category_id: input.categoryId,
        type: input.type,
        amount: input.amount,
        payee: input.payee,
        notes: input.notes,
        frequency: input.frequency,
        start_date: input.startDate,
        end_date: input.endDate,
        next_date: input.nextDate,
        active: input.active,
      },
      3,
    );
    const { rows } = await this.db.query<RecurringRow>(
      `UPDATE recurring_transactions SET ${set.sql} WHERE user_id = $1 AND id = $2 RETURNING *`,
      [userId, id, ...set.params],
    );
    return rows[0] ?? null;
  }

  /** Active rules with an occurrence on or before `today`, locked for this transaction. */
  async lockDue(today: string, userId?: string): Promise<RecurringRow[]> {
    const { rows } = await this.db.query<RecurringRow>(
      `SELECT * FROM recurring_transactions
       WHERE active AND next_date <= $1 AND ($2::uuid IS NULL OR user_id = $2::uuid)
       ORDER BY next_date
       FOR UPDATE SKIP LOCKED`,
      [today, userId ?? null],
    );
    return rows;
  }

  /** Inserts one transaction per date, copied from the rule. */
  async insertOccurrences(rule: RecurringRow, dates: string[]): Promise<void> {
    if (dates.length === 0) return;
    const params: unknown[] = [
      rule.user_id,
      rule.account_id,
      rule.transfer_account_id,
      rule.category_id,
      rule.type,
      rule.amount,
      rule.payee,
      rule.notes,
      rule.id,
    ];
    const values = dates.map((date) => {
      params.push(date);
      return `($1, $2, $3, $4, $5, $6, $${params.length}, $7, $8, $9)`;
    });
    await this.db.query(
      `INSERT INTO transactions
         (user_id, account_id, transfer_account_id, category_id, type, amount, date, payee, notes,
          recurring_id)
       VALUES ${values.join(', ')}`,
      params,
    );
  }

  async advance(id: string, nextDate: string, active: boolean): Promise<void> {
    await this.db.query(
      `UPDATE recurring_transactions SET next_date = $2, active = $3, updated_at = now()
       WHERE id = $1`,
      [id, nextDate, active],
    );
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      'DELETE FROM recurring_transactions WHERE user_id = $1 AND id = $2',
      [userId, id],
    );
    return rowCount > 0;
  }
}
