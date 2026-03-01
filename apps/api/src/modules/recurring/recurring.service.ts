import type { Database } from '../../db/types.js';
import { todayISO } from '../../lib/dates.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { checkTransactionReferences } from '../transactions/references.js';
import {
  RecurringRepository,
  toRecurring,
  type Recurring,
  type RecurringRow,
} from './recurring.repository.js';
import type { CreateRecurringInput, UpdateRecurringInput } from './recurring.schemas.js';
import { dueOccurrences, firstOccurrenceOnOrAfter, nextOccurrence } from './schedule.js';

export class RecurringService {
  private readonly recurring: RecurringRepository;

  constructor(
    private readonly db: Database,
    private readonly today: () => string = () => todayISO(),
  ) {
    this.recurring = new RecurringRepository(db);
  }

  async list(userId: string): Promise<Recurring[]> {
    return (await this.recurring.list(userId)).map(toRecurring);
  }

  async create(userId: string, input: CreateRecurringInput): Promise<Recurring> {
    await checkTransactionReferences(this.db, userId, input);
    const row = await this.recurring.create(userId, { ...input, nextDate: input.startDate });
    return toRecurring(row);
  }

  async update(userId: string, id: string, input: UpdateRecurringInput): Promise<Recurring> {
    const existing = await this.recurring.findById(userId, id);
    if (!existing) throw notFound('Recurring transaction');

    const type = input.type ?? existing.type;
    const changes: UpdateRecurringInput & { nextDate?: string } =
      type === 'transfer' ? { ...input } : { ...input, transferAccountId: null };

    await checkTransactionReferences(this.db, userId, {
      type,
      accountId: changes.accountId ?? existing.account_id,
      transferAccountId:
        changes.transferAccountId === undefined
          ? existing.transfer_account_id
          : changes.transferAccountId,
      categoryId: changes.categoryId === undefined ? existing.category_id : changes.categoryId,
    });

    const startDate = changes.startDate ?? existing.start_date;
    const endDate = changes.endDate === undefined ? existing.end_date : changes.endDate;
    if (endDate !== null && endDate < startDate) {
      throw badRequest('End date must be on or after the start date');
    }

    // A new schedule starts from its next occurrence that has not happened yet,
    // so editing a rule never back-fills transactions for past dates.
    if (changes.startDate !== undefined || changes.frequency !== undefined) {
      changes.nextDate = this.nextDateFor(existing, startDate, changes.frequency);
    }

    const row = await this.recurring.update(userId, id, changes);
    if (!row) throw notFound('Recurring transaction');
    return toRecurring(row);
  }

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.recurring.delete(userId, id))) throw notFound('Recurring transaction');
  }

  /**
   * Creates the transactions for every occurrence that is due by `today`
   * (for one user or everyone) and moves each rule to its next date.
   * Rules whose end date has passed are deactivated. Returns how many
   * transactions were created.
   */
  async processDue(today = this.today(), userId?: string): Promise<number> {
    return this.db.transaction(async (tx) => {
      const repo = new RecurringRepository(tx);
      let created = 0;

      for (const rule of await repo.lockDue(today, userId)) {
        const dates = dueOccurrences(rule.next_date, rule.frequency, today, rule.end_date);
        await repo.insertOccurrences(rule, dates);

        const last = dates.at(-1);
        const next = last ? nextOccurrence(last, rule.frequency) : rule.next_date;
        const finished = rule.end_date !== null && next > rule.end_date;
        await repo.advance(rule.id, next, !finished);
        created += dates.length;
      }
      return created;
    });
  }

  private nextDateFor(
    existing: RecurringRow,
    startDate: string,
    frequency = existing.frequency,
  ): string {
    const today = this.today();
    return startDate >= today ? startDate : firstOccurrenceOnOrAfter(startDate, frequency, today);
  }
}
