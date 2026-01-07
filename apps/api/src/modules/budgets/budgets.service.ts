import type { Database } from '../../db/types.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import { BudgetsRepository, type BudgetRow } from './budgets.repository.js';
import type { UpsertBudgetInput } from './budgets.schemas.js';

export interface Budget {
  id: string;
  categoryId: string;
  month: string;
  amount: number;
}

function toBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    month: row.month.slice(0, 7),
    amount: row.amount,
  };
}

export class BudgetsService {
  private readonly budgets: BudgetsRepository;
  private readonly categories: CategoriesRepository;

  constructor(db: Database) {
    this.budgets = new BudgetsRepository(db);
    this.categories = new CategoriesRepository(db);
  }

  async listForMonth(userId: string, month: string): Promise<Budget[]> {
    return (await this.budgets.listForMonth(userId, month)).map(toBudget);
  }

  /** Creates the budget for a category and month, or replaces its amount. */
  async upsert(userId: string, input: UpsertBudgetInput): Promise<Budget> {
    const category = await this.categories.findById(userId, input.categoryId);
    if (!category) throw badRequest('Unknown category');
    if (category.kind !== 'expense') throw badRequest('Budgets can only be set on expense categories');
    return toBudget(await this.budgets.upsert(userId, input));
  }

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.budgets.delete(userId, id))) throw notFound('Budget');
  }
}
