import type { Logger } from '../../lib/logger.js';
import type { RecurringService } from './recurring.service.js';

/**
 * Generates due recurring transactions now and then every `intervalMs`.
 * Returns a function that stops the timer.
 */
export function startRecurringScheduler(
  recurring: RecurringService,
  logger: Logger,
  intervalMs: number,
): () => void {
  let running = false;

  async function run() {
    if (running) return;
    running = true;
    try {
      const created = await recurring.processDue();
      if (created > 0) logger.info({ created }, 'generated recurring transactions');
    } catch (err) {
      logger.error({ err }, 'recurring transactions run failed');
    } finally {
      running = false;
    }
  }

  void run();
  const timer = setInterval(() => void run(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
