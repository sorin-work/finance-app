import type { Database } from '../../db/types.js';
import { notFound } from '../../lib/errors.js';
import { CategoriesRepository, toCategory, type Category } from './categories.repository.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.schemas.js';

export class CategoriesService {
  private readonly categories: CategoriesRepository;

  constructor(db: Database) {
    this.categories = new CategoriesRepository(db);
  }

  async list(userId: string): Promise<Category[]> {
    return (await this.categories.list(userId)).map(toCategory);
  }

  async create(userId: string, input: CreateCategoryInput): Promise<Category> {
    return toCategory(await this.categories.create(userId, input));
  }

  async update(userId: string, id: string, input: UpdateCategoryInput): Promise<Category> {
    const row = await this.categories.update(userId, id, input);
    if (!row) throw notFound('Category');
    return toCategory(row);
  }

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.categories.delete(userId, id))) throw notFound('Category');
  }
}
