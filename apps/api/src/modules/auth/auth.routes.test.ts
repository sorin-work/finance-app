import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, signUp, testConfig } from '../../../test/app.js';
import { createTestDatabase, resetDatabase } from '../../../test/db.js';
import type { Database } from '../../db/types.js';
import { signSessionToken } from './tokens.js';

describe('auth routes', () => {
  let db: Database;
  let app: ReturnType<typeof buildTestApp>;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = buildTestApp(db);
  });

  beforeEach(() => resetDatabase(db));
  afterAll(() => db.close());

  describe('POST /api/auth/register', () => {
    it('creates the user and starts a session', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'ana@example.com', password: 'longenough', name: 'Ana', currency: 'EUR' })
        .expect(201);

      expect(res.body.user).toMatchObject({
        email: 'ana@example.com',
        name: 'Ana',
        currency: 'EUR',
      });
      expect(res.body.user).not.toHaveProperty('password_hash');
      expect(res.headers['set-cookie']?.[0]).toMatch(/^fa_session=.+HttpOnly/);
    });

    it('defaults the currency to USD', async () => {
      const { user } = await signUp(app, { currency: undefined });
      expect(user.currency).toBe('USD');
    });

    it('rejects duplicate emails regardless of case', async () => {
      await signUp(app, { email: 'dup@example.com' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'DUP@example.com', password: 'longenough', name: 'Dup' });
      expect(res.status).toBe(409);
    });

    it('validates the payload', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'short', name: '' });
      expect(res.status).toBe(400);
      const paths = res.body.error.issues.map((i: { path: string }) => i.path);
      expect(paths).toEqual(expect.arrayContaining(['email', 'password', 'name']));
    });

    it('rejects unsupported currencies', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'x@example.com', password: 'longenough', name: 'X', currency: 'JPY' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with the right password', async () => {
      await signUp(app, { email: 'bob@example.com', password: 'secret-password' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'Bob@Example.com', password: 'secret-password' })
        .expect(200);
      expect(res.body.user.email).toBe('bob@example.com');
      expect(res.headers['set-cookie']?.[0]).toContain('fa_session=');
    });

    it('rejects a wrong password', async () => {
      await signUp(app, { email: 'bob@example.com', password: 'secret-password' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bob@example.com', password: 'nope-nope' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('invalid_credentials');
    });

    it('gives the same error for unknown emails', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'whatever' });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('rate limiting', () => {
    it('blocks repeated login attempts from the same client', async () => {
      const limited = buildTestApp(db, { authRateLimit: 3 });
      for (let i = 0; i < 3; i++) {
        await request(limited)
          .post('/api/auth/login')
          .send({ email: 'x@example.com', password: 'guess' })
          .expect(401);
      }
      const res = await request(limited)
        .post('/api/auth/login')
        .send({ email: 'x@example.com', password: 'guess' });
      expect(res.status).toBe(429);
      expect(res.headers['retry-after']).toBeDefined();
    });
  });

  describe('session', () => {
    it('returns the current user from the cookie', async () => {
      const { agent, user } = await signUp(app);
      const res = await agent.get('/api/auth/me').expect(200);
      expect(res.body.user.id).toBe(user.id);
    });

    it('accepts a bearer token', async () => {
      const { user } = await signUp(app);
      const token = signSessionToken(user.id, testConfig.jwtSecret, 1);
      await request(app).get('/api/auth/me').set('authorization', `Bearer ${token}`).expect(200);
    });

    it('rejects requests without a session', async () => {
      await request(app).get('/api/auth/me').expect(401);
    });

    it('rejects tokens signed with another secret', async () => {
      const { user } = await signUp(app);
      const token = signSessionToken(user.id, 'some-other-secret-that-is-long-enough', 1);
      await request(app).get('/api/auth/me').set('authorization', `Bearer ${token}`).expect(401);
    });

    it('clears the cookie on logout', async () => {
      const { agent } = await signUp(app);
      const res = await agent.post('/api/auth/logout').expect(204);
      expect(res.headers['set-cookie']?.[0]).toMatch(/fa_session=;/);
      await agent.get('/api/auth/me').expect(401);
    });
  });
});
