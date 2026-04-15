import { Router, type CookieOptions } from 'express';
import type { Config } from '../../config.js';
import { SESSION_COOKIE, currentUserId } from '../../middleware/auth.js';
import { changePasswordSchema, deleteAccountSchema, updateProfileSchema } from './users.schemas.js';
import type { UsersService } from './users.service.js';

export function usersRoutes(users: UsersService, config: Config): Router {
  const router = Router();

  router.patch('/me', async (req, res) => {
    const input = updateProfileSchema.parse(req.body);
    res.json({ user: await users.updateProfile(currentUserId(req), input) });
  });

  router.post('/me/password', async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await users.changePassword(currentUserId(req), currentPassword, newPassword);
    res.status(204).end();
  });

  router.delete('/me', async (req, res) => {
    const { password } = deleteAccountSchema.parse(req.body);
    await users.deleteAccount(currentUserId(req), password);
    const cookie: CookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.cookieSecure,
      path: '/',
    };
    res.clearCookie(SESSION_COOKIE, cookie);
    res.status(204).end();
  });

  return router;
}
