import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { conflict, notFound } from '../lib/errors.js';
import { errorHandler, notFoundHandler } from './error-handler.js';

function appThatThrows(error: unknown) {
  const app = express();
  app.use(express.json());
  app.post('/boom', () => {
    throw error;
  });
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('maps HttpError to its status and code', async () => {
    const res = await request(appThatThrows(notFound('Account'))).post('/boom');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'not_found', message: 'Account not found' } });
  });

  it('includes details when present', async () => {
    const err = conflict('Duplicate');
    const res = await request(appThatThrows(Object.assign(err, { details: { id: 1 } }))).post(
      '/boom',
    );
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ id: 1 });
  });

  it('turns zod errors into 400 with issues', async () => {
    const result = z.object({ name: z.string() }).safeParse({});
    const res = await request(appThatThrows(result.error)).post('/boom');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.issues[0].path).toBe('name');
  });

  it('rejects malformed json', async () => {
    const res = await request(appThatThrows(new Error('unused')))
      .post('/boom')
      .set('content-type', 'application/json')
      .send('{"oops"');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Malformed request body');
  });

  it('maps unique violations to 409', async () => {
    const res = await request(appThatThrows({ code: '23505', constraint: 'x' })).post('/boom');
    expect(res.status).toBe(409);
  });

  it('hides unexpected errors behind a 500', async () => {
    const res = await request(appThatThrows(new Error('secret details'))).post('/boom');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('returns json for unknown routes', async () => {
    const res = await request(appThatThrows(null)).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Route GET /nope not found');
  });
});
