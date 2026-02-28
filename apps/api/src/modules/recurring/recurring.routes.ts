import { Router } from 'express';
import { idParams } from '../../lib/validation.js';
import { currentUserId } from '../../middleware/auth.js';
import { createRecurringSchema, updateRecurringSchema } from './recurring.schemas.js';
import type { RecurringService } from './recurring.service.js';

export function recurringRoutes(recurring: RecurringService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json({ recurring: await recurring.list(currentUserId(req)) });
  });

  router.post('/', async (req, res) => {
    const input = createRecurringSchema.parse(req.body);
    res.status(201).json({ recurring: await recurring.create(currentUserId(req), input) });
  });

  router.patch('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    const input = updateRecurringSchema.parse(req.body);
    res.json({ recurring: await recurring.update(currentUserId(req), id, input) });
  });

  router.delete('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    await recurring.delete(currentUserId(req), id);
    res.status(204).end();
  });

  return router;
}
