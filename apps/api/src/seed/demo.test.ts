import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db.js';
import type { Database } from '../db/types.js';
import { AccountsRepository } from '../modules/accounts/accounts.repository.js';
import { DEMO_EMAIL, seedDemoData } from './demo.js';

describe('seedDemoData', () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(() => db.close());

  it('creates a demo user with a year of history', async () => {
    expect(await seedDemoData(db, { today: '2026-01-31', bcryptRounds: 4 })).toBe(true);

    const { rows: users } = await db.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [
      DEMO_EMAIL,
    ]);
    const userId = users[0]!.id;

    const { rows: range } = await db.query<{ first: string; last: string; count: number }>(
      'SELECT min(date)::text AS first, max(date)::text AS last, count(*) AS count FROM transactions WHERE user_id = $1',
      [userId],
    );
    expect(range[0]).toMatchObject({ first: '2025-02-01', last: '2026-01-31' });
    expect(range[0]!.count).toBeGreaterThan(400);

    const { rows: budgets } = await db.query('SELECT 1 FROM budgets WHERE user_id = $1', [userId]);
    expect(budgets.length).toBeGreaterThan(0);

    const balances = await new AccountsRepository(db).balances(userId);
    expect(balances.size).toBe(5);
  });

  it('does nothing when the demo user already exists', async () => {
    expect(await seedDemoData(db, { today: '2026-01-31', bcryptRounds: 4 })).toBe(false);
  });

  it('never creates transactions in the future', async () => {
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*) AS n FROM transactions WHERE date > '2026-01-31'`,
    );
    expect(rows[0]!.n).toBe(0);
  });
});
