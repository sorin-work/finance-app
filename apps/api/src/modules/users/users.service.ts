import type { Database } from '../../db/types.js';
import { HttpError, notFound } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { UsersRepository, toUser, type User } from './users.repository.js';
import type { UpdateProfileInput } from './users.schemas.js';

export class UsersService {
  private readonly users: UsersRepository;

  constructor(
    db: Database,
    private readonly options: { bcryptRounds: number },
  ) {
    this.users = new UsersRepository(db);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    const row = await this.users.update(userId, input);
    if (!row) throw notFound('User');
    return toUser(row);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    await this.checkPassword(userId, currentPassword);
    await this.users.setPasswordHash(
      userId,
      await hashPassword(newPassword, this.options.bcryptRounds),
    );
  }

  /** Permanently deletes the user and, through cascades, all of their data. */
  async deleteAccount(userId: string, password: string): Promise<void> {
    await this.checkPassword(userId, password);
    await this.users.delete(userId);
  }

  private async checkPassword(userId: string, password: string) {
    const row = await this.users.findById(userId);
    if (!row) throw notFound('User');
    if (!(await verifyPassword(password, row.password_hash))) {
      throw new HttpError(400, 'Current password is incorrect', 'invalid_password');
    }
  }
}
