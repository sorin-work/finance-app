import { Router } from 'express';
import { idParams } from '../../lib/validation.js';
import { currentUserId } from '../../middleware/auth.js';
import { createCategorySchema, updateCategorySchema } from './categories.schemas.js';
import type { CategoriesService } from './categories.service.js';

export function categoriesRoutes(categories: CategoriesService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json({ categories: await categories.list(currentUserId(req)) });
  });

  router.post('/', async (req, res) => {
    const input = createCategorySchema.parse(req.body);
    res.status(201).json({ category: await categories.create(currentUserId(req), input) });
  });

  router.patch('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    const input = updateCategorySchema.parse(req.body);
    res.json({ category: await categories.update(currentUserId(req), id, input) });
  });

  router.delete('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    await categories.delete(currentUserId(req), id);
    res.status(204).end();
  });

  return router;
}
