import { existsSync } from 'node:fs';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './lib/logger.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const config = loadConfig();
const logger = createLogger(config.logLevel);
const app = createApp({ logger });

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'api listening');
});

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
