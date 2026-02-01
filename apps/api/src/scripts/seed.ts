import { existsSync } from 'node:fs';
import { loadConfig } from '../config.js';
import { migrate } from '../db/migrate.js';
import { createPostgresDatabase } from '../db/postgres.js';
import { DEMO_EMAIL, DEMO_PASSWORD, seedDemoData } from '../seed/demo.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const config = loadConfig();
const db = createPostgresDatabase(config.databaseUrl);

try {
  await migrate(db);
  const created = await seedDemoData(db, { bcryptRounds: config.bcryptRounds });
  console.log(
    created
      ? `Demo data created. Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`
      : `${DEMO_EMAIL} already exists, nothing to do.`,
  );
} finally {
  await db.close();
}
