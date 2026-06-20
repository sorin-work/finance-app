import type { Database } from '../../db/types.js';
import { todayISO } from '../../lib/dates.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { centsToDecimal } from '../../lib/money.js';
import { GoalsRepository, type GoalRow } from './goals.repository.js';
import type { CreateGoalInput, UpdateGoalInput } from './goals.schemas.js';
import { goalProjection, type GoalProjection } from './projection.js';

export interface Goal extends GoalProjection {
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

export function toGoal(row: GoalRow, today: string): Goal {
  const targets = {
    targetAmount: row.target_amount,
    savedAmount: row.saved_amount,
    targetDate: row.target_date,
  };
  return {
    ...goalProjection(targets, today),
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

  constructor(
    db: Database,
    private readonly today: () => string = () => todayISO(),
  ) {
    this.goals = new GoalsRepository(db);
  }

  async list(userId: string): Promise<Goal[]> {
    const today = this.today();
    return (await this.goals.list(userId)).map((row) => toGoal(row, today));
  }

  async create(userId: string, input: CreateGoalInput): Promise<Goal> {
    return toGoal(await this.goals.create(userId, input), this.today());
  }

  async update(userId: string, id: string, input: UpdateGoalInput): Promise<Goal> {
    const row = await this.goals.update(userId, id, input);
    if (!row) throw notFound('Goal');
    return toGoal(row, this.today());
  }

  /** Adds money to a goal, or takes it out when `amount` is negative. */
  async contribute(userId: string, id: string, amount: number): Promise<Goal> {
    const row = await this.goals.addToSaved(userId, id, amount);
    if (row) return toGoal(row, this.today());

    const goal = await this.goals.findById(userId, id);
    if (!goal) throw notFound('Goal');
    throw badRequest(
      `Cannot withdraw more than the ${centsToDecimal(goal.saved_amount)} saved in "${goal.name}"`,
    );
  }

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.goals.delete(userId, id))) throw notFound('Goal');
  }
}
