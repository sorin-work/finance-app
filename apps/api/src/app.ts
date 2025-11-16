import express from 'express';
import { pinoHttp } from 'pino-http';
import type { Database } from './db/types.js';
import type { Logger } from './lib/logger.js';

export interface AppDeps {
  logger: Logger;
  db: Database;
}

export function createApp({ logger, db }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', database: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'down' });
    }
  });

  return app;
}
