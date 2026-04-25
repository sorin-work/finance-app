import { Router } from 'express';
import { z } from 'zod';
import { currentMonth } from '../../lib/dates.js';
import { isoMonth } from '../../lib/validation.js';
import { currentUserId } from '../../middleware/auth.js';
import type { ReportsService } from './reports.service.js';

const summaryQuery = z.object({ month: isoMonth.optional() });

const seriesQuery = z.object({
  end: isoMonth.optional(),
  months: z.coerce.number().int().min(1).max(36).default(12),
});

export function reportsRoutes(reports: ReportsService): Router {
  const router = Router();

  router.get('/summary', async (req, res) => {
    const { month = currentMonth() } = summaryQuery.parse(req.query);
    res.json(await reports.summary(currentUserId(req), month));
  });

  router.get('/cashflow', async (req, res) => {
    const { end = currentMonth(), months } = seriesQuery.parse(req.query);
    res.json({ months: await reports.cashflow(currentUserId(req), end, months) });
  });

  router.get('/net-worth', async (req, res) => {
    const { end = currentMonth(), months } = seriesQuery.parse(req.query);
    res.json({ months: await reports.netWorth(currentUserId(req), end, months) });
  });

  return router;
}
