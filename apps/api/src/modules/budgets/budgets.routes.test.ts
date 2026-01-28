import type { Agent } from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, signUp } from '../../../test/app.js';
import { createTestDatabase, resetDatabase } from '../../../test/db.js';
import type { Database } from '../../db/types.js';

describe('budgets routes', () => {
  let db: Database;
  let app: ReturnType<typeof buildTestApp>;
  let agent: Agent;
  let accountId: string;
  let categories: { id: string; name: string }[];

  const category = (name: string) => categories.find((c) => c.name === name)!.id;

  async function spend(amount: number, date: string, categoryName: string | null = 'Groceries') {
    await agent
      .post('/api/transactions')
      .send({
        accountId,
        type: 'expense',
        amount,
        date,
        categoryId: categoryName ? category(categoryName) : null,
      })
      .expect(201);
  }

  beforeAll(async () => {
    db = await createTestDatabase();
    app = buildTestApp(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
    ({ agent } = await signUp(app));
    accountId = (await agent.post('/api/accounts').send({ name: 'Main', type: 'checking' })).body
      .account.id;
    categories = (await agent.get('/api/categories')).body.categories;
  });

  afterAll(() => db.close());

  it('creates a budget and then updates its amount', async () => {
    const first = await agent
      .put('/api/budgets')
      .send({ categoryId: category('Groceries'), month: '2026-01', amount: 400_00 })
      .expect(200);
    const second = await agent
      .put('/api/budgets')
      .send({ categoryId: category('Groceries'), month: '2026-01', amount: 450_00 })
      .expect(200);

    expect(second.body.budget.id).toBe(first.body.budget.id);
    expect(second.body.budget).toMatchObject({ month: '2026-01', amount: 450_00 });

    const list = await agent.get('/api/budgets?month=2026-01').expect(200);
    expect(list.body.budgets).toHaveLength(1);
  });

  it('reports spending and status per budget', async () => {
    await agent
      .put('/api/budgets')
      .send({ categoryId: category('Groceries'), month: '2026-01', amount: 200_00 });
    await agent
      .put('/api/budgets')
      .send({ categoryId: category('Dining Out'), month: '2026-01', amount: 100_00 });

    await spend(120_00, '2026-01-05');
    await spend(50_00, '2026-01-12');
    await spend(130_00, '2026-01-09', 'Dining Out');

    const res = await agent.get('/api/budgets?month=2026-01').expect(200);
    const byCategory = Object.fromEntries(
      res.body.budgets.map((b: { categoryId: string }) => [b.categoryId, b]),
    );

    expect(byCategory[category('Groceries')]).toMatchObject({
      spent: 170_00,
      remaining: 30_00,
      percent: 85,
      status: 'warning',
    });
    expect(byCategory[category('Dining Out')]).toMatchObject({ spent: 130_00, status: 'over' });
    expect(res.body.totals).toEqual({ budgeted: 300_00, spent: 300_00, remaining: 0 });
  });

  it('only counts expenses from the requested month', async () => {
    await agent
      .put('/api/budgets')
      .send({ categoryId: category('Groceries'), month: '2026-01', amount: 200_00 });
    await spend(10_00, '2025-12-20');
    await spend(20_00, '2026-01-15');
    await spend(40_00, '2026-02-01');
    await agent.post('/api/transactions').send({
      accountId,
      type: 'income',
      amount: 999_00,
      date: '2026-01-15',
      categoryId: category('Salary'),
    });

    const res = await agent.get('/api/budgets?month=2026-01');
    expect(res.body.budgets[0].spent).toBe(20_00);
  });

  describe('copy', () => {
    beforeEach(async () => {
      for (const [name, amount] of [
        ['Groceries', 400_00],
        ['Housing', 1200_00],
      ] as const) {
        await agent
          .put('/api/budgets')
          .send({ categoryId: category(name), month: '2025-12', amount })
          .expect(200);
      }
    });

    it("copies last month's budgets into an empty month", async () => {
      const res = await agent
        .post('/api/budgets/copy')
        .send({ from: '2025-12', to: '2026-01' })
        .expect(200);
      expect(res.body).toEqual({ copied: 2 });

      const january = await agent.get('/api/budgets?month=2026-01');
      expect(january.body.totals.budgeted).toBe(1600_00);
    });

    it('keeps budgets that already exist unless asked to overwrite', async () => {
      await agent
        .put('/api/budgets')
        .send({ categoryId: category('Groceries'), month: '2026-01', amount: 500_00 });

      const skipped = await agent.post('/api/budgets/copy').send({ from: '2025-12', to: '2026-01' });
      expect(skipped.body.copied).toBe(1);
      let january = await agent.get('/api/budgets?month=2026-01');
      expect(january.body.totals.budgeted).toBe(1700_00);

      await agent
        .post('/api/budgets/copy')
        .send({ from: '2025-12', to: '2026-01', overwrite: true })
        .expect(200);
      january = await agent.get('/api/budgets?month=2026-01');
      expect(january.body.totals.budgeted).toBe(1600_00);
    });

    it('rejects copying a month onto itself', async () => {
      await agent.post('/api/budgets/copy').send({ from: '2025-12', to: '2025-12' }).expect(400);
    });
  });

  it('counts spending on the first and last day of the month', async () => {
    await agent
      .put('/api/budgets')
      .send({ categoryId: category('Groceries'), month: '2026-01', amount: 200_00 });
    await spend(11_00, '2026-01-01');
    await spend(22_00, '2026-01-31');

    const res = await agent.get('/api/budgets?month=2026-01');
    expect(res.body.budgets[0].spent).toBe(33_00);
  });

  it('rejects budgets on income categories', async () => {
    const res = await agent
      .put('/api/budgets')
      .send({ categoryId: category('Salary'), month: '2026-01', amount: 100 });
    expect(res.status).toBe(400);
  });

  it('validates the month', async () => {
    await agent.get('/api/budgets').expect(400);
    await agent.get('/api/budgets?month=2026-13').expect(400);
  });

  it('deletes a budget', async () => {
    const { budget } = (
      await agent
        .put('/api/budgets')
        .send({ categoryId: category('Groceries'), month: '2026-01', amount: 100 })
    ).body;
    await agent.delete(`/api/budgets/${budget.id}`).expect(204);
    await agent.delete(`/api/budgets/${budget.id}`).expect(404);
  });

  it("does not let users touch each other's budgets", async () => {
    const { budget } = (
      await agent
        .put('/api/budgets')
        .send({ categoryId: category('Groceries'), month: '2026-01', amount: 100 })
    ).body;

    const other = await signUp(app);
    await other.agent.delete(`/api/budgets/${budget.id}`).expect(404);
    await other.agent
      .put('/api/budgets')
      .send({ categoryId: category('Groceries'), month: '2026-01', amount: 1 })
      .expect(400);
    expect((await other.agent.get('/api/budgets?month=2026-01')).body.budgets).toEqual([]);
  });
});
