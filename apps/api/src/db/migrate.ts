import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from './types.js';

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url));

// Arbitrary constant so concurrent API instances don't run migrations twice.
const MIGRATION_LOCK_ID = 72_310_001;

/**
 * Applies every `*.sql` file in the migrations directory that has not been
 * applied yet, in filename order, inside a single transaction.
 * Returns the names of the migrations that ran.
 */
export async function migrate(db: Database, dir = MIGRATIONS_DIR): Promise<string[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

  return db.transaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_ID]);
    await tx.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await tx.query<{ name: string }>('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    const ran: string[] = [];

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(dir, file), 'utf8');
      await tx.exec(sql);
      await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      ran.push(file);
    }
    return ran;
  });
}
