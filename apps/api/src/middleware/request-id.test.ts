import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/app.js';
import { createTestDatabase } from '../../test/db.js';
import type { Database } from '../db/types.js';

describe('request ids', () => {
  let db: Database;
  let app: ReturnType<typeof buildTestApp>;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = buildTestApp(db);
  });

  afterAll(() => db.close());

  it('adds an id to every response', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('keeps the id sent by a proxy', async () => {
    const res = await request(app).get('/api/health').set('X-Request-Id', 'edge-1234');
    expect(res.headers['x-request-id']).toBe('edge-1234');
  });

  it('ignores ids that look unsafe', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('X-Request-Id', '<script>alert(1)</script>');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
