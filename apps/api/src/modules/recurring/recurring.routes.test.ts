import type { Agent } from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, signUp } from '../../../test/app.js';
import { createTestDatabase, resetDatabase } from '../../../test/db.js';
import type { Database } from '../../db/types.js';
import { addDays, addMonths, todayISO } from '../../lib/dates.js';
import { RecurringService } from './recurring.service.js';

describe('recurring transactions', () => {
  let db: Database;
  let app: ReturnType<typeof buildTestApp>;
  let agent: Agent;
  let checking: string;
  let savings: string;
  let categories: { id: string; name: string }[];

  const category = (name: string) => categories.find((c) => c.name === name)!.id;

  function rule(overrides: Record<string, unknown> = {}) {
    return {
      accountId: checking,
      categoryId: category('Subscriptions'),
      type: 'expense',
      amount: 15_49,
      payee: 'Netflix',
      frequency: 'monthly',
      startDate: '2026-01-10',
      ...overrides,
    };
  }

  async function transactionsFor(recurringId: string) {
    const { rows } = await db.query<{ date: string; amount: number }>(
      'SELECT date, amount FROM transactions WHERE recurring_id = $1 ORDER BY date',
      [recurringId],
    );
    return rows;
  }

  beforeAll(async () => {
    db = await createTestDatabase();
    app = buildTestApp(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
    ({ agent } = await signUp(app));
    checking = (await agent.post('/api/accounts').send({ name: 'Checking', type: 'checking' })).body
      .account.id;
    savings = (await agent.post('/api/accounts').send({ name: 'Savings', type: 'savings' })).body
      .account.id;
    categories = (await agent.get('/api/categories')).body.categories;
  });

  afterAll(() => db.close());

  describe('CRUD', () => {
    it('creates a rule whose next date is the start date', async () => {
      const res = await agent.post('/api/recurring').send(rule()).expect(201);
      expect(res.body.recurring).toMatchObject({
        payee: 'Netflix',
        frequency: 'monthly',
        startDate: '2026-01-10',
        nextDate: '2026-01-10',
        endDate: null,
        active: true,
      });

      const list = await agent.get('/api/recurring').expect(200);
      expect(list.body.recurring).toHaveLength(1);
    });

    it('validates references like a normal transaction', async () => {
      await agent
        .post('/api/recurring')
        .send(rule({ categoryId: category('Salary') }))
        .expect(400);
      await agent
        .post('/api/recurring')
        .send(rule({ type: 'transfer', categoryId: null }))
        .expect(400);
      await agent
        .post('/api/recurring')
        .send(rule({ frequency: 'hourly' }))
        .expect(400);
      await agent
        .post('/api/recurring')
        .send(rule({ endDate: '2025-12-31' }))
        .expect(400);
    });

    it('updates and deletes a rule', async () => {
      const { recurring } = (await agent.post('/api/recurring').send(rule())).body;
      const res = await agent
        .patch(`/api/recurring/${recurring.id}`)
        .send({ amount: 17_99, active: false })
        .expect(200);
      expect(res.body.recurring).toMatchObject({ amount: 17_99, active: false });

      await agent.delete(`/api/recurring/${recurring.id}`).expect(204);
      await agent.delete(`/api/recurring/${recurring.id}`).expect(404);
    });

    it('does not back-fill past dates when the schedule changes', async () => {
      const today = todayISO();
      const { recurring } = (
        await agent.post('/api/recurring').send(rule({ startDate: addMonths(today, 1) }))
      ).body;
      const res = await agent
        .patch(`/api/recurring/${recurring.id}`)
        .send({ startDate: addMonths(today, -6), frequency: 'weekly' })
        .expect(200);
      expect(res.body.recurring.nextDate >= today).toBe(true);
    });
  });

  describe('processing', () => {
    it('creates every missed occurrence and advances the rule', async () => {
      const { recurring } = (await agent.post('/api/recurring').send(rule())).body;

      const created = await new RecurringService(db).processDue('2026-03-15');
      expect(created).toBe(3);
      expect((await transactionsFor(recurring.id)).map((t) => t.date)).toEqual([
        '2026-01-10',
        '2026-02-10',
        '2026-03-10',
      ]);

      const list = await agent.get('/api/recurring');
      expect(list.body.recurring[0].nextDate).toBe('2026-04-10');
    });

    it('keeps rules that start on the 31st on the last day of the month', async () => {
      const { recurring } = (
        await agent.post('/api/recurring').send(rule({ startDate: '2025-12-31', payee: 'Rent' }))
      ).body;

      await new RecurringService(db).processDue('2026-02-28');
      await new RecurringService(db).processDue('2026-04-30');
      expect((await transactionsFor(recurring.id)).map((t) => t.date)).toEqual([
        '2025-12-31',
        '2026-01-31',
        '2026-02-28',
        '2026-03-31',
        '2026-04-30',
      ]);
    });

    it('is idempotent for the same day', async () => {
      await agent.post('/api/recurring').send(rule());
      const service = new RecurringService(db);
      await service.processDue('2026-03-15');
      expect(await service.processDue('2026-03-15')).toBe(0);
    });

    it('stops and deactivates a rule after its end date', async () => {
      const { recurring } = (
        await agent
          .post('/api/recurring')
          .send(rule({ frequency: 'weekly', startDate: '2026-01-01', endDate: '2026-01-20' }))
      ).body;

      await new RecurringService(db).processDue('2026-06-01');
      expect(await transactionsFor(recurring.id)).toHaveLength(3);
      const list = await agent.get('/api/recurring');
      expect(list.body.recurring[0].active).toBe(false);
    });

    it('skips inactive rules', async () => {
      await agent.post('/api/recurring').send(rule({ active: false }));
      expect(await new RecurringService(db).processDue('2026-06-01')).toBe(0);
    });

    it('creates transfers between accounts', async () => {
      await agent.post('/api/recurring').send(
        rule({
          type: 'transfer',
          categoryId: null,
          transferAccountId: savings,
          amount: 500_00,
          payee: 'Savings',
          startDate: '2026-02-26',
        }),
      );
      await new RecurringService(db).processDue('2026-03-31');
      const res = await agent.get(`/api/accounts/${savings}`);
      expect(res.body.account.balance).toBe(1000_00);
    });

    it('runs on demand for the current user only', async () => {
      const yesterday = addDays(todayISO(), -1);
      await agent.post('/api/recurring').send(rule({ startDate: yesterday }));

      const other = await signUp(app);
      const otherAccount = (
        await other.agent.post('/api/accounts').send({ name: 'Other', type: 'checking' })
      ).body.account.id;
      await other.agent
        .post('/api/recurring')
        .send(rule({ accountId: otherAccount, categoryId: null, startDate: yesterday }));

      const res = await agent.post('/api/recurring/run').expect(200);
      expect(res.body).toEqual({ created: 1 });
      const { rows } = await db.query('SELECT 1 FROM transactions WHERE recurring_id IS NOT NULL');
      expect(rows).toHaveLength(1);
    });
  });
});
