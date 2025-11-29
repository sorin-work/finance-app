import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, signUp } from '../../../test/app.js';
import { createTestDatabase, resetDatabase } from '../../../test/db.js';
import type { Database } from '../../db/types.js';

describe('accounts routes', () => {
  let db: Database;
  let app: ReturnType<typeof buildTestApp>;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = buildTestApp(db);
  });

  beforeEach(() => resetDatabase(db));
  afterAll(() => db.close());

  it('requires authentication', async () => {
    await request(app).get('/api/accounts').expect(401);
  });

  it('creates, lists, updates and deletes accounts', async () => {
    const { agent } = await signUp(app);

    const created = await agent
      .post('/api/accounts')
      .send({ name: 'Everyday', type: 'checking', openingBalance: 150_00 })
      .expect(201);
    const id = created.body.account.id;
    expect(created.body.account).toMatchObject({ name: 'Everyday', balance: 150_00 });

    const list = await agent.get('/api/accounts').expect(200);
    expect(list.body.accounts).toHaveLength(1);

    const updated = await agent.patch(`/api/accounts/${id}`).send({ name: 'Main' }).expect(200);
    expect(updated.body.account).toMatchObject({ name: 'Main', type: 'checking' });

    await agent.delete(`/api/accounts/${id}`).expect(204);
    await agent.get(`/api/accounts/${id}`).expect(404);
  });

  it('does not expose other users accounts', async () => {
    const alice = await signUp(app);
    const bob = await signUp(app);
    const created = await alice.agent
      .post('/api/accounts')
      .send({ name: 'Private', type: 'savings' })
      .expect(201);

    await bob.agent.get(`/api/accounts/${created.body.account.id}`).expect(404);
    await bob.agent.patch(`/api/accounts/${created.body.account.id}`).send({ name: 'x' }).expect(404);
    expect((await bob.agent.get('/api/accounts')).body.accounts).toEqual([]);
  });

  it('validates input', async () => {
    const { agent } = await signUp(app);
    await agent.post('/api/accounts').send({ name: 'X', type: 'piggy-bank' }).expect(400);
    await agent.post('/api/accounts').send({ name: 'X', type: 'cash', openingBalance: 1.5 }).expect(400);
    await agent.get('/api/accounts/not-a-uuid').expect(400);
  });
});
