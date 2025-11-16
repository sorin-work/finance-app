import pg from 'pg';
import type { Database, Queryable } from './types.js';

// Money is stored as BIGINT minor units (cents). Values stay far below
// Number.MAX_SAFE_INTEGER, so parse them as plain numbers instead of strings.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number.parseInt(value, 10));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));
// DATE columns are calendar dates. Keep them as YYYY-MM-DD strings rather than
// letting pg turn them into Date objects in the server's local timezone.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

function wrap(client: pg.Pool | pg.PoolClient): Queryable {
  return {
    async query<T>(text: string, params?: unknown[]) {
      const result = await client.query(text, params);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async exec(sql: string) {
      await client.query(sql);
    },
  };
}

export function createPostgresDatabase(connectionString: string): Database {
  const pool = new pg.Pool({ connectionString, max: 10 });

  return {
    ...wrap(pool),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(wrap(client));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
