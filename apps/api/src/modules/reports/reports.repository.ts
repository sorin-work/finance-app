import type { Queryable } from '../../db/types.js';

export interface MonthlyTotalsRow {
  month: string;
  income: number;
  expenses: number;
}

export class ReportsRepository {
  constructor(private readonly db: Queryable) {}

  /** Income and expense totals between two dates. Transfers are not counted. */
  async totals(
    userId: string,
    from: string,
    to: string,
  ): Promise<{ income: number; expenses: number }> {
    const { rows } = await this.db.query<{ income: number; expenses: number }>(
      `SELECT COALESCE(sum(amount) FILTER (WHERE type = 'income'), 0)::bigint AS income,
              COALESCE(sum(amount) FILTER (WHERE type = 'expense'), 0)::bigint AS expenses
       FROM transactions
       WHERE user_id = $1 AND date >= $2 AND date <= $3`,
      [userId, from, to],
    );
    return rows[0] ?? { income: 0, expenses: 0 };
  }

  /** Income and expenses grouped by calendar month (YYYY-MM), oldest first. */
  async monthlyTotals(userId: string, from: string, to: string): Promise<MonthlyTotalsRow[]> {
    const { rows } = await this.db.query<MonthlyTotalsRow>(
      `SELECT to_char(date, 'YYYY-MM') AS month,
              COALESCE(sum(amount) FILTER (WHERE type = 'income'), 0)::bigint AS income,
              COALESCE(sum(amount) FILTER (WHERE type = 'expense'), 0)::bigint AS expenses
       FROM transactions
       WHERE user_id = $1 AND date >= $2 AND date <= $3
       GROUP BY 1
       ORDER BY 1`,
      [userId, from, to],
    );
    return rows;
  }
}
