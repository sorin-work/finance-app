import { Router } from 'express';
import { idParams } from '../../lib/validation.js';
import { currentUserId } from '../../middleware/auth.js';
import { contributionSchema, createGoalSchema, updateGoalSchema } from './goals.schemas.js';
import type { GoalsService } from './goals.service.js';

export function goalsRoutes(goals: GoalsService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json({ goals: await goals.list(currentUserId(req)) });
  });

  router.post('/', async (req, res) => {
    const input = createGoalSchema.parse(req.body);
    res.status(201).json({ goal: await goals.create(currentUserId(req), input) });
  });

  router.patch('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    const input = updateGoalSchema.parse(req.body);
    res.json({ goal: await goals.update(currentUserId(req), id, input) });
  });

  router.post('/:id/contributions', async (req, res) => {
    const { id } = idParams.parse(req.params);
    const { amount } = contributionSchema.parse(req.body);
    res.json({ goal: await goals.contribute(currentUserId(req), id, amount) });
  });

  router.delete('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    await goals.delete(currentUserId(req), id);
    res.status(204).end();
  });

  return router;
}
