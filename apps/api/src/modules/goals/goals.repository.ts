import type { Queryable } from '../../db/types.js';
import { setClause } from '../../lib/sql.js';
import type { CreateGoalInput, UpdateGoalInput } from './goals.schemas.js';

export interface GoalRow {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  color: string;
  created_at: Date;
  updated_at: Date;
}

export class GoalsRepository {
  constructor(private readonly db: Queryable) {}

  async list(userId: string): Promise<GoalRow[]> {
    const { rows } = await this.db.query<GoalRow>(
      `SELECT * FROM goals WHERE user_id = $1
       ORDER BY saved_amount >= target_amount, target_date NULLS LAST, created_at`,
      [userId],
    );
    return rows;
  }

  async create(userId: string, input: CreateGoalInput): Promise<GoalRow> {
    const { rows } = await this.db.query<GoalRow>(
      `INSERT INTO goals (user_id, name, target_amount, saved_amount, target_date, color)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, input.name, input.targetAmount, input.savedAmount, input.targetDate, input.color],
    );
    return rows[0]!;
  }

  async update(userId: string, id: string, input: UpdateGoalInput): Promise<GoalRow | null> {
    const set = setClause(
      {
        name: input.name,
        target_amount: input.targetAmount,
        target_date: input.targetDate,
        color: input.color,
      },
      3,
    );
    const { rows } = await this.db.query<GoalRow>(
      `UPDATE goals SET ${set.sql} WHERE user_id = $1 AND id = $2 RETURNING *`,
      [userId, id, ...set.params],
    );
    return rows[0] ?? null;
  }

  async findById(userId: string, id: string): Promise<GoalRow | null> {
    const { rows } = await this.db.query<GoalRow>(
      'SELECT * FROM goals WHERE user_id = $1 AND id = $2',
      [userId, id],
    );
    return rows[0] ?? null;
  }

  /** Adds to the saved amount unless that would take it below zero. */
  async addToSaved(userId: string, id: string, amount: number): Promise<GoalRow | null> {
    const { rows } = await this.db.query<GoalRow>(
      `UPDATE goals SET saved_amount = saved_amount + $3, updated_at = now()
       WHERE user_id = $1 AND id = $2 AND saved_amount + $3 >= 0
       RETURNING *`,
      [userId, id, amount],
    );
    return rows[0] ?? null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query('DELETE FROM goals WHERE user_id = $1 AND id = $2', [
      userId,
      id,
    ]);
    return rowCount > 0;
  }
}
