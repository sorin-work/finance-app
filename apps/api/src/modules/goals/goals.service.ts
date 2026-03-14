import type { Database } from '../../db/types.js';
import { notFound } from '../../lib/errors.js';
import { GoalsRepository, type GoalRow } from './goals.repository.js';
import type { CreateGoalInput, UpdateGoalInput } from './goals.schemas.js';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
  color: string;
  /** Saved as a percentage of the target, capped at 100. */
  progress: number;
  completed: boolean;
}

export function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    savedAmount: row.saved_amount,
    targetDate: row.target_date,
    color: row.color,
    progress: Math.min(100, Math.round((row.saved_amount / row.target_amount) * 1000) / 10),
    completed: row.saved_amount >= row.target_amount,
  };
}

export class GoalsService {
  private readonly goals: GoalsRepository;

  constructor(db: Database) {
    this.goals = new GoalsRepository(db);
  }

  async list(userId: string): Promise<Goal[]> {
    return (await this.goals.list(userId)).map(toGoal);
  }

  async create(userId: string, input: CreateGoalInput): Promise<Goal> {
    return toGoal(await this.goals.create(userId, input));
  }

  async update(userId: string, id: string, input: UpdateGoalInput): Promise<Goal> {
    const row = await this.goals.update(userId, id, input);
    if (!row) throw notFound('Goal');
    return toGoal(row);
  }

  /** Adds money to a goal, or takes it out when `amount` is negative. */
  async contribute(userId: string, id: string, amount: number): Promise<Goal> {
    const row = await this.goals.addToSaved(userId, id, amount);
    if (!row) throw notFound('Goal');
    return toGoal(row);
  }

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.goals.delete(userId, id))) throw notFound('Goal');
  }
}
