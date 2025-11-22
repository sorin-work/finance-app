import { Router, type CookieOptions, type Response } from 'express';
import type { Config } from '../../config.js';
import { unauthorized } from '../../lib/errors.js';
import { SESSION_COOKIE, currentUserId, requireAuth } from '../../middleware/auth.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import type { AuthService } from './auth.service.js';
import { signSessionToken } from './tokens.js';

export function authRoutes(auth: AuthService, config: Config): Router {
  const router = Router();

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
  };

  function startSession(res: Response, userId: string) {
    const token = signSessionToken(userId, config.jwtSecret, config.sessionTtlDays);
    res.cookie(SESSION_COOKIE, token, {
      ...cookieOptions,
      maxAge: config.sessionTtlDays * 24 * 60 * 60 * 1000,
    });
  }

  router.post('/register', async (req, res) => {
    const input = registerSchema.parse(req.body);
    const user = await auth.register(input);
    startSession(res, user.id);
    res.status(201).json({ user });
  });

  router.post('/login', async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await auth.login(input);
    startSession(res, user.id);
    res.json({ user });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get('/me', requireAuth(config.jwtSecret), async (req, res) => {
    const user = await auth.getUser(currentUserId(req));
    if (!user) throw unauthorized();
    res.json({ user });
  });

  return router;
}
