import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, signUp } from '../../../test/app.js';
import { createTestDatabase, resetDatabase } from '../../../test/db.js';
import type { Database } from '../../db/types.js';
import { DEFAULT_CATEGORIES } from './defaults.js';

describe('categories routes', () => {
  let db: Database;
  let app: ReturnType<typeof buildTestApp>;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = buildTestApp(db);
  });

  beforeEach(() => resetDatabase(db));
  afterAll(() => db.close());

  it('gives new users the default categories', async () => {
    const { agent } = await signUp(app);
    const res = await agent.get('/api/categories').expect(200);
    expect(res.body.categories).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(res.body.categories[0].kind).toBe('income');
  });

  it('creates, renames and deletes a category', async () => {
    const { agent } = await signUp(app);
    const created = await agent
      .post('/api/categories')
      .send({ name: 'Pets', kind: 'expense', color: '#a855f7' })
      .expect(201);
    const id = created.body.category.id;

    const renamed = await agent.patch(`/api/categories/${id}`).send({ name: 'Pet care' }).expect(200);
    expect(renamed.body.category).toEqual({ id, name: 'Pet care', kind: 'expense', color: '#a855f7' });

    await agent.delete(`/api/categories/${id}`).expect(204);
    await agent.delete(`/api/categories/${id}`).expect(404);
  });

  it('rejects duplicate names within the same kind', async () => {
    const { agent } = await signUp(app);
    await agent.post('/api/categories').send({ name: 'groceries', kind: 'expense' }).expect(409);
    // Same name is fine for the other kind.
    await agent.post('/api/categories').send({ name: 'Groceries', kind: 'income' }).expect(201);
  });

  it('validates colors', async () => {
    const { agent } = await signUp(app);
    await agent.post('/api/categories').send({ name: 'X', kind: 'expense', color: 'red' }).expect(400);
  });
});
