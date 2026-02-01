import { PGlite, types } from '@electric-sql/pglite';
import { migrate } from '../src/db/migrate.js';
import type { Database, Queryable } from '../src/db/types.js';

// Match the type parsing configured for node-postgres in src/db/postgres.ts.
const parsers = {
  [types.INT8]: (value: string) => Number.parseInt(value, 10),
  [types.NUMERIC]: (value: string) => Number(value),
  [types.DATE]: (value: string) => value,
};

type PgliteConnection = Pick<PGlite, 'query' | 'exec'>;

function wrap(conn: PgliteConnection): Queryable {
  return {
    async query<T>(text: string, params?: unknown[]) {
      const result = await conn.query<T>(text, params);
      // node-postgres reports the number of rows for SELECT too; PGlite reports 0.
      return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
    },
    async exec(sql: string) {
      await conn.exec(sql);
    },
  };
}

/** In-memory Postgres (PGlite) with all migrations applied. */
export async function createTestDatabase(): Promise<Database> {
  const pglite = new PGlite({ parsers });
  const db: Database = {
    ...wrap(pglite),
    transaction: (fn) => pglite.transaction((tx) => fn(wrap(tx))),
    close: () => pglite.close(),
  };
  await migrate(db);
  return db;
}

/** Empties every application table, keeping the schema. */
export async function resetDatabase(db: Database): Promise<void> {
  await db.exec(`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN SELECT tablename FROM pg_tables
               WHERE schemaname = 'public' AND tablename <> 'schema_migrations'
      LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
}
