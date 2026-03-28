import { Router } from 'express';
import { todayISO } from '../../lib/dates.js';
import { idParams } from '../../lib/validation.js';
import { currentUserId } from '../../middleware/auth.js';
import {
  createTransactionSchema,
  exportTransactionsQuery,
  importTransactionsSchema,
  listTransactionsQuery,
  updateTransactionSchema,
} from './transactions.schemas.js';
import type { TransactionsService } from './transactions.service.js';

export function transactionsRoutes(transactions: TransactionsService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = listTransactionsQuery.parse(req.query);
    res.json(await transactions.list(currentUserId(req), query));
  });

  router.get('/export', async (req, res) => {
    const filters = exportTransactionsQuery.parse(req.query);
    const csv = await transactions.exportCsv(currentUserId(req), filters);
    res.type('text/csv; charset=utf-8').attachment(`transactions-${todayISO()}.csv`).send(csv);
  });

  router.post('/import', async (req, res) => {
    const input = importTransactionsSchema.parse(req.body);
    res.json(await transactions.importCsv(currentUserId(req), input));
  });

  router.post('/', async (req, res) => {
    const input = createTransactionSchema.parse(req.body);
    res.status(201).json({ transaction: await transactions.create(currentUserId(req), input) });
  });

  router.get('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    res.json({ transaction: await transactions.get(currentUserId(req), id) });
  });

  router.patch('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    const input = updateTransactionSchema.parse(req.body);
    res.json({ transaction: await transactions.update(currentUserId(req), id, input) });
  });

  router.delete('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    await transactions.delete(currentUserId(req), id);
    res.status(204).end();
  });

  return router;
}
