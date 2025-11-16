import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db.js';
import { migrate } from './migrate.js';
import type { Database } from './types.js';

describe('migrate', () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.close();
  });

  it('records applied migrations', async () => {
    const { rows } = await db.query<{ name: string }>(
      'SELECT name FROM schema_migrations ORDER BY name',
    );
    expect(rows.map((r) => r.name)).toContain('001_create_users.sql');
  });

  it('is idempotent', async () => {
    expect(await migrate(db)).toEqual([]);
  });

  it('enforces case-insensitive unique emails', async () => {
    await db.query(`INSERT INTO users (email, name, password_hash) VALUES ('a@b.co', 'A', 'x')`);
    await expect(
      db.query(`INSERT INTO users (email, name, password_hash) VALUES ('A@B.co', 'A', 'x')`),
    ).rejects.toThrow(/users_email_key/);
  });
});
