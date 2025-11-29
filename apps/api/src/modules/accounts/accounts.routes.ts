import { Router } from 'express';
import { idParams } from '../../lib/validation.js';
import { currentUserId } from '../../middleware/auth.js';
import { createAccountSchema, updateAccountSchema } from './accounts.schemas.js';
import type { AccountsService } from './accounts.service.js';

export function accountsRoutes(accounts: AccountsService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json({ accounts: await accounts.list(currentUserId(req)) });
  });

  router.post('/', async (req, res) => {
    const input = createAccountSchema.parse(req.body);
    const account = await accounts.create(currentUserId(req), input);
    res.status(201).json({ account });
  });

  router.get('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    res.json({ account: await accounts.get(currentUserId(req), id) });
  });

  router.patch('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    const input = updateAccountSchema.parse(req.body);
    res.json({ account: await accounts.update(currentUserId(req), id, input) });
  });

  router.delete('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    await accounts.delete(currentUserId(req), id);
    res.status(204).end();
  });

  return router;
}
