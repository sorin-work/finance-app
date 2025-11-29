import type { Database } from '../../db/types.js';
import { HttpError, conflict } from '../../lib/errors.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import { DEFAULT_CATEGORIES } from '../categories/defaults.js';
import { UsersRepository, toUser, type User } from '../users/users.repository.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { hashPassword, verifyPassword } from './password.js';

export class AuthService {
  private readonly users: UsersRepository;
  // Compared against when the email is unknown so that login takes the same
  // time whether or not the account exists.
  private dummyHash?: Promise<string>;

  constructor(
    private readonly db: Database,
    private readonly options: { bcryptRounds: number },
  ) {
    this.users = new UsersRepository(db);
  }

  async register(input: RegisterInput): Promise<User> {
    if (await this.users.findByEmail(input.email)) {
      throw conflict('An account with this email already exists');
    }
    const passwordHash = await hashPassword(input.password, this.options.bcryptRounds);
    const row = await this.db.transaction(async (tx) => {
      const user = await new UsersRepository(tx).create({
        email: input.email,
        name: input.name,
        passwordHash,
        currency: input.currency,
      });
      await new CategoriesRepository(tx).createMany(user.id, DEFAULT_CATEGORIES);
      return user;
    });
    return toUser(row);
  }

  async login(input: LoginInput): Promise<User> {
    const row = await this.users.findByEmail(input.email);
    this.dummyHash ??= hashPassword('not-a-real-password', this.options.bcryptRounds);
    const ok = await verifyPassword(input.password, row?.password_hash ?? (await this.dummyHash));
    if (!row || !ok) {
      throw new HttpError(401, 'Invalid email or password', 'invalid_credentials');
    }
    return toUser(row);
  }

  async getUser(id: string): Promise<User | null> {
    const row = await this.users.findById(id);
    return row ? toUser(row) : null;
  }
}
