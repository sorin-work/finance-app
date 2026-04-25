import type { Database } from '../../db/types.js';
import { monthRange, monthsBetween, shiftMonth } from '../../lib/dates.js';
import { AccountsRepository } from '../accounts/accounts.repository.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import { TransactionsRepository } from '../transactions/transactions.repository.js';
import {
  categoryBreakdown,
  netWorthSeries,
  savingsRate,
  type CategorySpending,
  type NetWorthPoint,
} from './calculations.js';
import { ReportsRepository } from './reports.repository.js';

export interface MonthSummary {
  month: string;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number | null;
  byCategory: CategorySpending[];
}

export interface CashflowMonth {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export class ReportsService {
  private readonly reports: ReportsRepository;
  private readonly transactions: TransactionsRepository;
  private readonly categories: CategoriesRepository;
  private readonly accounts: AccountsRepository;

  constructor(db: Database) {
    this.accounts = new AccountsRepository(db);
    this.reports = new ReportsRepository(db);
    this.transactions = new TransactionsRepository(db);
    this.categories = new CategoriesRepository(db);
  }

  async summary(userId: string, month: string): Promise<MonthSummary> {
    const { start, end } = monthRange(month);
    const [totals, spending, categories] = await Promise.all([
      this.reports.totals(userId, start, end),
      this.transactions.spendingByCategory(userId, start, end),
      this.categories.list(userId),
    ]);

    return {
      month,
      income: totals.income,
      expenses: totals.expenses,
      net: totals.income - totals.expenses,
      savingsRate: savingsRate(totals.income, totals.expenses),
      byCategory: categoryBreakdown(spending, categories),
    };
  }

  /** Assets, liabilities and net worth at the end of each of the last `months` months. */
  async netWorth(userId: string, endMonth: string, months: number): Promise<NetWorthPoint[]> {
    const [accounts, deltas] = await Promise.all([
      this.accounts.list(userId),
      this.reports.accountDeltas(userId, monthRange(endMonth).end),
    ]);
    return netWorthSeries(
      accounts.map((a) => ({ id: a.id, type: a.type, openingBalance: a.opening_balance })),
      deltas.map((d) => ({ accountId: d.account_id, month: d.month, delta: d.delta })),
      monthsBetween(shiftMonth(endMonth, -(months - 1)), endMonth),
    );
  }

  /** Income vs expenses for the `months` months ending with `endMonth`. */
  async cashflow(userId: string, endMonth: string, months: number): Promise<CashflowMonth[]> {
    const startMonth = shiftMonth(endMonth, -(months - 1));
    const rows = await this.reports.monthlyTotals(
      userId,
      monthRange(startMonth).start,
      monthRange(endMonth).end,
    );
    return rows.map((row) => ({ ...row, net: row.income - row.expenses }));
  }
}
