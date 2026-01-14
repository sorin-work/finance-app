import type { Queryable } from '../../db/types.js';

export interface BudgetRow {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  amount: number;
  created_at: Date;
  updated_at: Date;
}

const firstDay = (month: string) => `${month}-01`;

export class BudgetsRepository {
  constructor(private readonly db: Queryable) {}

  async listForMonth(userId: string, month: string): Promise<BudgetRow[]> {
    const { rows } = await this.db.query<BudgetRow>(
      `SELECT b.* FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = $1 AND b.month = $2
       ORDER BY lower(c.name)`,
      [userId, firstDay(month)],
    );
    return rows;
  }

  async upsert(
    userId: string,
    input: { categoryId: string; month: string; amount: number },
  ): Promise<BudgetRow> {
    const { rows } = await this.db.query<BudgetRow>(
      `INSERT INTO budgets (user_id, category_id, month, amount)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, category_id, month)
       DO UPDATE SET amount = EXCLUDED.amount, updated_at = now()
       RETURNING *`,
      [userId, input.categoryId, firstDay(input.month), input.amount],
    );
    return rows[0]!;
  }

  /** Copies every budget of one month into another. Returns how many were written. */
  async copyMonth(userId: string, from: string, to: string, overwrite: boolean): Promise<number> {
    const onConflict = overwrite
      ? 'DO UPDATE SET amount = EXCLUDED.amount, updated_at = now()'
      : 'DO NOTHING';
    const { rowCount } = await this.db.query(
      `INSERT INTO budgets (user_id, category_id, month, amount)
       SELECT user_id, category_id, $3, amount
       FROM budgets
       WHERE user_id = $1 AND month = $2
       ON CONFLICT (user_id, category_id, month) ${onConflict}`,
      [userId, firstDay(from), firstDay(to)],
    );
    return rowCount;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query('DELETE FROM budgets WHERE user_id = $1 AND id = $2', [
      userId,
      id,
    ]);
    return rowCount > 0;
  }
}
