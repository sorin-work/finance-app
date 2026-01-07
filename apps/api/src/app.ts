import cookieParser from 'cookie-parser';
import express from 'express';
import { pinoHttp } from 'pino-http';
import type { Config } from './config.js';
import type { Database } from './db/types.js';
import type { Logger } from './lib/logger.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { accountsRoutes } from './modules/accounts/accounts.routes.js';
import { AccountsService } from './modules/accounts/accounts.service.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { budgetsRoutes } from './modules/budgets/budgets.routes.js';
import { BudgetsService } from './modules/budgets/budgets.service.js';
import { categoriesRoutes } from './modules/categories/categories.routes.js';
import { CategoriesService } from './modules/categories/categories.service.js';
import { transactionsRoutes } from './modules/transactions/transactions.routes.js';
import { TransactionsService } from './modules/transactions/transactions.service.js';

export interface AppDeps {
  logger: Logger;
  db: Database;
  config: Config;
}

export function createApp({ logger, db, config }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', database: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'down' });
    }
  });

  const auth = new AuthService(db, { bcryptRounds: config.bcryptRounds });
  app.use('/api/auth', authRoutes(auth, config));

  const authed = requireAuth(config.jwtSecret);
  app.use('/api/accounts', authed, accountsRoutes(new AccountsService(db)));
  app.use('/api/categories', authed, categoriesRoutes(new CategoriesService(db)));
  app.use('/api/transactions', authed, transactionsRoutes(new TransactionsService(db)));
  app.use('/api/budgets', authed, budgetsRoutes(new BudgetsService(db)));

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
