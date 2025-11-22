import { existsSync } from 'node:fs';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { migrate } from './db/migrate.js';
import { createPostgresDatabase } from './db/postgres.js';
import { createLogger } from './lib/logger.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const config = loadConfig();
const logger = createLogger(config.logLevel);
const db = createPostgresDatabase(config.databaseUrl);

const applied = await migrate(db);
if (applied.length > 0) logger.info({ migrations: applied }, 'applied migrations');

const app = createApp({ logger, db, config });

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'api listening');
});

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close(() => {
    db.close().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
