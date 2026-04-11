import type { RequestHandler } from 'express';
import { HttpError } from '../lib/errors.js';

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Length of the window in milliseconds. */
  windowMs: number;
  /** Requests allowed per client within one window. */
  max: number;
  now?: () => number;
}

/**
 * Fixed-window rate limiter keyed by client IP. State lives in memory, which
 * is enough for a single API instance; put a shared store behind it before
 * running several.
 */
export function rateLimit({ windowMs, max, now = Date.now }: RateLimitOptions): RequestHandler {
  const windows = new Map<string, Window>();

  function sweep(time: number) {
    for (const [key, window] of windows) {
      if (window.resetAt <= time) windows.delete(key);
    }
  }

  return (req, res, next) => {
    const time = now();
    if (windows.size > 10_000) sweep(time);

    const key = req.ip ?? 'unknown';
    let window = windows.get(key);
    if (!window || window.resetAt <= time) {
      window = { count: 0, resetAt: time + windowMs };
      windows.set(key, window);
    }
    window.count += 1;

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - window.count)));

    if (window.count > max) {
      const retryAfter = Math.ceil((window.resetAt - time) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      next(new HttpError(429, 'Too many attempts. Try again in a few minutes.', 'rate_limited'));
      return;
    }
    next();
  };
}
