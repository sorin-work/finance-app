import request from 'supertest';
import { createApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import type { Database } from '../src/db/types.js';
import { createLogger } from '../src/lib/logger.js';

export const testConfig: Config = {
  env: 'test',
  port: 0,
  logLevel: 'silent',
  databaseUrl: 'pglite://memory',
  jwtSecret: 'test-secret-that-is-long-enough-for-hs256',
  sessionTtlDays: 7,
  cookieSecure: false,
  bcryptRounds: 4,
  seedDemo: false,
};

export function buildTestApp(db: Database, overrides: Partial<Config> = {}) {
  return createApp({ db, logger: createLogger('silent'), config: { ...testConfig, ...overrides } });
}

type App = ReturnType<typeof buildTestApp>;

let counter = 0;

/** Registers a fresh user and returns a supertest agent that carries the session cookie. */
export async function signUp(app: App, overrides: Record<string, unknown> = {}) {
  counter += 1;
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/register')
    .send({
      email: `user${counter}@example.com`,
      password: 'correct horse battery',
      name: `User ${counter}`,
      ...overrides,
    })
    .expect(201);
  return { agent, user: res.body.user as { id: string; email: string; currency: string } };
}
