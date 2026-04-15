import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, signUp } from '../../../test/app.js';
import { createTestDatabase, resetDatabase } from '../../../test/db.js';
import type { Database } from '../../db/types.js';

describe('users routes', () => {
  let db: Database;
  let app: ReturnType<typeof buildTestApp>;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = buildTestApp(db);
  });

  beforeEach(() => resetDatabase(db));
  afterAll(() => db.close());

  it('updates the name and currency', async () => {
    const { agent } = await signUp(app);
    const res = await agent
      .patch('/api/users/me')
      .send({ name: 'Ana Pop', currency: 'RON' })
      .expect(200);
    expect(res.body.user).toMatchObject({ name: 'Ana Pop', currency: 'RON' });
    expect((await agent.get('/api/auth/me')).body.user.currency).toBe('RON');
  });

  it('validates profile changes', async () => {
    const { agent } = await signUp(app);
    await agent.patch('/api/users/me').send({}).expect(400);
    await agent.patch('/api/users/me').send({ currency: 'BTC' }).expect(400);
  });

  it('changes the password after checking the current one', async () => {
    const { agent, user } = await signUp(app, { password: 'old-password' });

    const wrong = await agent
      .post('/api/users/me/password')
      .send({ currentPassword: 'nope', newPassword: 'new-password' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('invalid_password');

    await agent
      .post('/api/users/me/password')
      .send({ currentPassword: 'old-password', newPassword: 'new-password' })
      .expect(204);

    await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'old-password' })
      .expect(401);
    await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'new-password' })
      .expect(200);
  });

  it('deletes the account and all of its data', async () => {
    const { agent, user } = await signUp(app, { password: 'delete-me-please' });
    await agent.post('/api/accounts').send({ name: 'Main', type: 'checking' }).expect(201);

    await agent.delete('/api/users/me').send({ password: 'wrong' }).expect(400);
    const res = await agent.delete('/api/users/me').send({ password: 'delete-me-please' });
    expect(res.status).toBe(204);
    expect(res.headers['set-cookie']?.[0]).toMatch(/fa_session=;/);

    const { rows } = await db.query('SELECT 1 FROM accounts WHERE user_id = $1', [user.id]);
    expect(rows).toHaveLength(0);
    await agent.get('/api/auth/me').expect(401);
  });

  it('requires a session', async () => {
    await request(app).patch('/api/users/me').send({ name: 'x' }).expect(401);
  });
});
