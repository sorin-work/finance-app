import type { Agent } from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, signUp } from '../../../test/app.js';
import { createTestDatabase, resetDatabase } from '../../../test/db.js';
import type { Database } from '../../db/types.js';

interface Category {
  id: string;
  name: string;
  kind: string;
}

describe('transactions routes', () => {
  let db: Database;
  let app: ReturnType<typeof buildTestApp>;
  let agent: Agent;
  let checking: string;
  let savings: string;
  let categories: Category[];

  const category = (name: string) => categories.find((c) => c.name === name)!.id;

  async function createAccount(name: string, type = 'checking', openingBalance = 0) {
    const res = await agent.post('/api/accounts').send({ name, type, openingBalance }).expect(201);
    return res.body.account.id as string;
  }

  async function balanceOf(id: string) {
    return (await agent.get(`/api/accounts/${id}`).expect(200)).body.account.balance as number;
  }

  beforeAll(async () => {
    db = await createTestDatabase();
    app = buildTestApp(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
    ({ agent } = await signUp(app));
    checking = await createAccount('Checking', 'checking', 500_00);
    savings = await createAccount('Savings', 'savings', 0);
    categories = (await agent.get('/api/categories')).body.categories;
  });

  afterAll(() => db.close());

  describe('create', () => {
    it('creates an expense with defaults', async () => {
      const res = await agent
        .post('/api/transactions')
        .send({ accountId: checking, type: 'expense', amount: 12_99, date: '2025-12-01' })
        .expect(201);
      expect(res.body.transaction).toMatchObject({
        accountId: checking,
        categoryId: null,
        transferAccountId: null,
        type: 'expense',
        amount: 12_99,
        date: '2025-12-01',
        payee: '',
        notes: '',
      });
    });

    it('rejects amounts that are not positive integer cents', async () => {
      for (const amount of [0, -5, 1.5, '10']) {
        await agent
          .post('/api/transactions')
          .send({ accountId: checking, type: 'expense', amount, date: '2025-12-01' })
          .expect(400);
      }
    });

    it('rejects invalid calendar dates', async () => {
      await agent
        .post('/api/transactions')
        .send({ accountId: checking, type: 'expense', amount: 100, date: '2025-02-30' })
        .expect(400);
    });

    it('rejects categories of the wrong kind', async () => {
      const res = await agent.post('/api/transactions').send({
        accountId: checking,
        categoryId: category('Salary'),
        type: 'expense',
        amount: 100,
        date: '2025-12-01',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('income category');
    });

    it("rejects another user's account", async () => {
      const other = await signUp(app);
      const res = await other.agent
        .post('/api/transactions')
        .send({ accountId: checking, type: 'expense', amount: 100, date: '2025-12-01' });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Unknown account');
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      const rows = [
        { type: 'income', amount: 3000_00, date: '2025-11-28', categoryId: category('Salary') },
        { type: 'expense', amount: 54_20, date: '2025-12-01', categoryId: category('Groceries') },
        { type: 'expense', amount: 9_99, date: '2025-12-03', categoryId: category('Subscriptions') },
        { type: 'expense', amount: 23_10, date: '2025-12-05', categoryId: category('Groceries') },
      ];
      for (const row of rows) {
        await agent
          .post('/api/transactions')
          .send({ accountId: checking, ...row })
          .expect(201);
      }
    });

    it('returns newest first with a total', async () => {
      const res = await agent.get('/api/transactions').expect(200);
      expect(res.body.total).toBe(4);
      expect(res.body.items.map((t: { date: string }) => t.date)).toEqual([
        '2025-12-05',
        '2025-12-03',
        '2025-12-01',
        '2025-11-28',
      ]);
    });

    it('filters by date range, type and category', async () => {
      const inDecember = await agent.get('/api/transactions?from=2025-12-01&to=2025-12-03');
      expect(inDecember.body.total).toBe(2);

      const income = await agent.get('/api/transactions?type=income');
      expect(income.body.items).toHaveLength(1);

      const groceries = await agent.get(`/api/transactions?categoryId=${category('Groceries')}`);
      expect(groceries.body.total).toBe(2);
    });

    it('paginates', async () => {
      const page2 = await agent.get('/api/transactions?page=2&pageSize=3').expect(200);
      expect(page2.body).toMatchObject({ total: 4, page: 2, pageSize: 3 });
      expect(page2.body.items).toHaveLength(1);
      expect(page2.body.items[0].date).toBe('2025-11-28');
    });

    it('rejects bad query parameters', async () => {
      await agent.get('/api/transactions?pageSize=1000').expect(400);
      await agent.get('/api/transactions?from=yesterday').expect(400);
    });
  });

  describe('update and delete', () => {
    it('updates fields and keeps the balance in sync', async () => {
      const { transaction } = (
        await agent
          .post('/api/transactions')
          .send({ accountId: checking, type: 'expense', amount: 100_00, date: '2025-12-01' })
      ).body;
      expect(await balanceOf(checking)).toBe(400_00);

      const res = await agent
        .patch(`/api/transactions/${transaction.id}`)
        .send({ amount: 50_00, payee: 'Hardware store' })
        .expect(200);
      expect(res.body.transaction).toMatchObject({ amount: 50_00, payee: 'Hardware store' });
      expect(await balanceOf(checking)).toBe(450_00);

      await agent.delete(`/api/transactions/${transaction.id}`).expect(204);
      expect(await balanceOf(checking)).toBe(500_00);
      await agent.get(`/api/transactions/${transaction.id}`).expect(404);
    });

    it('validates the merged result of a partial update', async () => {
      const { transaction } = (
        await agent.post('/api/transactions').send({
          accountId: checking,
          type: 'expense',
          amount: 100,
          date: '2025-12-01',
          categoryId: category('Groceries'),
        })
      ).body;

      await agent.patch(`/api/transactions/${transaction.id}`).send({ type: 'income' }).expect(400);
      await agent
        .patch(`/api/transactions/${transaction.id}`)
        .send({ type: 'income', categoryId: category('Salary') })
        .expect(200);
    });
  });

  describe('transfers', () => {
    it('moves money between accounts', async () => {
      await agent
        .post('/api/transactions')
        .send({
          accountId: checking,
          transferAccountId: savings,
          type: 'transfer',
          amount: 200_00,
          date: '2025-12-02',
        })
        .expect(201);

      expect(await balanceOf(checking)).toBe(300_00);
      expect(await balanceOf(savings)).toBe(200_00);
    });

    it('shows transfers when filtering by either account', async () => {
      await agent.post('/api/transactions').send({
        accountId: checking,
        transferAccountId: savings,
        type: 'transfer',
        amount: 1_00,
        date: '2025-12-02',
      });
      expect((await agent.get(`/api/transactions?accountId=${savings}`)).body.total).toBe(1);
      expect((await agent.get(`/api/transactions?accountId=${checking}`)).body.total).toBe(1);
    });

    it('requires a destination account and no category', async () => {
      await agent
        .post('/api/transactions')
        .send({ accountId: checking, type: 'transfer', amount: 100, date: '2025-12-02' })
        .expect(400);
      await agent
        .post('/api/transactions')
        .send({
          accountId: checking,
          transferAccountId: savings,
          categoryId: category('Other'),
          type: 'transfer',
          amount: 100,
          date: '2025-12-02',
        })
        .expect(400);
    });

    it('drops the destination when a transfer becomes an expense', async () => {
      const { transaction } = (
        await agent.post('/api/transactions').send({
          accountId: checking,
          transferAccountId: savings,
          type: 'transfer',
          amount: 100_00,
          date: '2025-12-02',
        })
      ).body;

      const res = await agent
        .patch(`/api/transactions/${transaction.id}`)
        .send({ type: 'expense' })
        .expect(200);
      expect(res.body.transaction.transferAccountId).toBeNull();
      expect(await balanceOf(savings)).toBe(0);
      expect(await balanceOf(checking)).toBe(400_00);
    });
  });
});
