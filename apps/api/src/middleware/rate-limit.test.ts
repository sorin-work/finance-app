import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from './error-handler.js';
import { rateLimit } from './rate-limit.js';

function appWithLimit(max: number, clock: { now: number }) {
  const app = express();
  app.post('/login', rateLimit({ windowMs: 60_000, max, now: () => clock.now }), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe('rateLimit', () => {
  it('allows requests up to the limit and then returns 429', async () => {
    const clock = { now: 0 };
    const app = appWithLimit(2, clock);

    const first = await request(app).post('/login').expect(200);
    expect(first.headers['ratelimit-remaining']).toBe('1');
    await request(app).post('/login').expect(200);

    const blocked = await request(app).post('/login').expect(429);
    expect(blocked.body.error.code).toBe('rate_limited');
    expect(blocked.headers['retry-after']).toBe('60');
  });

  it('starts a new window once the old one expires', async () => {
    const clock = { now: 0 };
    const app = appWithLimit(1, clock);

    await request(app).post('/login').expect(200);
    await request(app).post('/login').expect(429);
    clock.now = 60_001;
    await request(app).post('/login').expect(200);
  });
});
