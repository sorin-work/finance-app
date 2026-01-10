import type { Database } from '../../db/types.js';
import { monthRange } from '../../lib/dates.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import { TransactionsRepository } from '../transactions/transactions.repository.js';
import { BudgetsRepository, type BudgetRow } from './budgets.repository.js';
import type { UpsertBudgetInput } from './budgets.schemas.js';
import { budgetProgress, budgetTotals, type BudgetProgress, type BudgetTotals } from './progress.js';

export interface Budget {
  id: string;
  categoryId: string;
  month: string;
  amount: number;
}

export type BudgetWithProgress = Budget & BudgetProgress;

export interface MonthBudgets {
  month: string;
  totals: BudgetTotals;
  budgets: BudgetWithProgress[];
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
  private readonly transactions: TransactionsRepository;

  constructor(db: Database) {
    this.budgets = new BudgetsRepository(db);
    this.categories = new CategoriesRepository(db);
    this.transactions = new TransactionsRepository(db);
  }

  /** Budgets for a month with how much has been spent against each one. */
  async forMonth(userId: string, month: string): Promise<MonthBudgets> {
    const { start, end } = monthRange(month);
    const [rows, spending] = await Promise.all([
      this.budgets.listForMonth(userId, month),
      this.transactions.spendingByCategory(userId, start, end),
    ]);

    const budgets = rows.map((row) => ({
      ...toBudget(row),
      ...budgetProgress(row.amount, spending.get(row.category_id) ?? 0),
    }));
    return { month, totals: budgetTotals(budgets), budgets };
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
