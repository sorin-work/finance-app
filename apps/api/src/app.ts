import express from 'express';
import { pinoHttp } from 'pino-http';
import type { Logger } from './lib/logger.js';

export interface AppDeps {
  logger: Logger;
}

export function createApp({ logger }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
