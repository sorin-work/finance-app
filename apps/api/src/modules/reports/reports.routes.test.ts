import type { Agent } from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, signUp } from '../../../test/app.js';
import { createTestDatabase, resetDatabase } from '../../../test/db.js';
import type { Database } from '../../db/types.js';

describe('reports routes', () => {
  let db: Database;
  let app: ReturnType<typeof buildTestApp>;
  let agent: Agent;
  let checking: string;
  let card: string;
  let categories: { id: string; name: string }[];

  const category = (name: string) => categories.find((c) => c.name === name)!.id;

  async function add(tx: Record<string, unknown>) {
    await agent
      .post('/api/transactions')
      .send({ accountId: checking, ...tx })
      .expect(201);
  }

  beforeAll(async () => {
    db = await createTestDatabase();
    app = buildTestApp(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
    ({ agent } = await signUp(app));
    checking = (
      await agent
        .post('/api/accounts')
        .send({ name: 'Checking', type: 'checking', openingBalance: 1000_00 })
    ).body.account.id;
    card = (
      await agent
        .post('/api/accounts')
        .send({ name: 'Card', type: 'credit_card', openingBalance: -100_00 })
    ).body.account.id;
    categories = (await agent.get('/api/categories')).body.categories;

    await add({
      type: 'income',
      amount: 3000_00,
      date: '2026-07-25',
      categoryId: category('Salary'),
    });
    await add({
      type: 'expense',
      amount: 1200_00,
      date: '2026-07-01',
      categoryId: category('Housing'),
    });
    await add({
      type: 'expense',
      amount: 300_00,
      date: '2026-07-31',
      categoryId: category('Groceries'),
    });
    await add({
      type: 'income',
      amount: 3000_00,
      date: '2026-08-25',
      categoryId: category('Salary'),
    });
    await add({
      type: 'expense',
      amount: 1200_00,
      date: '2026-08-01',
      categoryId: category('Housing'),
    });
    await add({ accountId: card, type: 'expense', amount: 250_00, date: '2026-08-10' });
    await add({ transferAccountId: card, type: 'transfer', amount: 350_00, date: '2026-08-20' });
  });

  afterAll(() => db.close());

  describe('summary', () => {
    it('totals income and spending for the month', async () => {
      const res = await agent.get('/api/reports/summary?month=2026-07').expect(200);
      expect(res.body).toMatchObject({
        month: '2026-07',
        income: 3000_00,
        expenses: 1500_00,
        net: 1500_00,
        savingsRate: 50,
      });
      expect(res.body.byCategory.map((c: { name: string }) => c.name)).toEqual([
        'Housing',
        'Groceries',
      ]);
    });

    it('leaves transfers out and groups uncategorized spending', async () => {
      const res = await agent.get('/api/reports/summary?month=2026-08').expect(200);
      expect(res.body.expenses).toBe(1450_00);
      expect(res.body.byCategory).toContainEqual(
        expect.objectContaining({ categoryId: null, name: 'Uncategorized', amount: 250_00 }),
      );
    });

    it('rejects a malformed month', async () => {
      await agent.get('/api/reports/summary?month=July').expect(400);
    });
  });

  describe('cashflow', () => {
    it('returns one row per month, oldest first', async () => {
      const res = await agent.get('/api/reports/cashflow?end=2026-08&months=2').expect(200);
      expect(res.body.months).toEqual([
        { month: '2026-07', income: 3000_00, expenses: 1500_00, net: 1500_00 },
        { month: '2026-08', income: 3000_00, expenses: 1450_00, net: 1550_00 },
      ]);
    });

    it('includes months without transactions as zero', async () => {
      const res = await agent.get('/api/reports/cashflow?end=2026-09&months=4').expect(200);
      expect(res.body.months.map((m: { month: string }) => m.month)).toEqual([
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
      ]);
      expect(res.body.months[0]).toEqual({ month: '2026-06', income: 0, expenses: 0, net: 0 });
    });

    it('limits the number of months', async () => {
      await agent.get('/api/reports/cashflow?months=100').expect(400);
    });
  });

  describe('net worth', () => {
    it('tracks assets and liabilities at the end of each month', async () => {
      const res = await agent.get('/api/reports/net-worth?end=2026-08&months=3').expect(200);
      expect(res.body.months).toEqual([
        { month: '2026-06', assets: 1000_00, liabilities: 100_00, netWorth: 900_00 },
        { month: '2026-07', assets: 2500_00, liabilities: 100_00, netWorth: 2400_00 },
        { month: '2026-08', assets: 3950_00, liabilities: 0, netWorth: 3950_00 },
      ]);
    });

    it('matches the current account balances for the latest month', async () => {
      const accounts = (await agent.get('/api/accounts')).body.accounts as { balance: number }[];
      const total = accounts.reduce((sum, a) => sum + a.balance, 0);
      const res = await agent.get('/api/reports/net-worth?end=2026-08&months=1');
      expect(res.body.months[0].netWorth).toBe(total);
    });
  });
});
