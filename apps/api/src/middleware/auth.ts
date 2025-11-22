import type { Request, RequestHandler } from 'express';
import { unauthorized } from '../lib/errors.js';
import { verifySessionToken } from '../modules/auth/tokens.js';

export const SESSION_COOKIE = 'fa_session';

function tokenFrom(req: Request): string | undefined {
  const cookie = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
  if (cookie) return cookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length);
  return undefined;
}

export function requireAuth(jwtSecret: string): RequestHandler {
  return (req, _res, next) => {
    const token = tokenFrom(req);
    const userId = token ? verifySessionToken(token, jwtSecret) : null;
    if (!userId) {
      next(unauthorized());
      return;
    }
    req.userId = userId;
    next();
  };
}

/** The authenticated user's id. Only call this behind requireAuth. */
export function currentUserId(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
