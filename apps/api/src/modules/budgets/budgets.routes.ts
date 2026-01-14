import { Router } from 'express';
import { idParams } from '../../lib/validation.js';
import { currentUserId } from '../../middleware/auth.js';
import { budgetsQuery, copyBudgetsSchema, upsertBudgetSchema } from './budgets.schemas.js';
import type { BudgetsService } from './budgets.service.js';

export function budgetsRoutes(budgets: BudgetsService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { month } = budgetsQuery.parse(req.query);
    res.json(await budgets.forMonth(currentUserId(req), month));
  });

  router.put('/', async (req, res) => {
    const input = upsertBudgetSchema.parse(req.body);
    res.json({ budget: await budgets.upsert(currentUserId(req), input) });
  });

  router.post('/copy', async (req, res) => {
    const input = copyBudgetsSchema.parse(req.body);
    res.json(await budgets.copy(currentUserId(req), input));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    await budgets.delete(currentUserId(req), id);
    res.status(204).end();
  });

  return router;
}
