import type { Queryable } from '../../db/types.js';
import { setClause } from '../../lib/sql.js';
import type {
  CategoryKind,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './categories.schemas.js';

export interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
}

export function toCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, kind: row.kind, color: row.color };
}

export class CategoriesRepository {
  constructor(private readonly db: Queryable) {}

  async list(userId: string): Promise<CategoryRow[]> {
    const { rows } = await this.db.query<CategoryRow>(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY kind DESC, lower(name)',
      [userId],
    );
    return rows;
  }

  async findById(userId: string, id: string): Promise<CategoryRow | null> {
    const { rows } = await this.db.query<CategoryRow>(
      'SELECT * FROM categories WHERE user_id = $1 AND id = $2',
      [userId, id],
    );
    return rows[0] ?? null;
  }

  async create(userId: string, input: CreateCategoryInput): Promise<CategoryRow> {
    const { rows } = await this.db.query<CategoryRow>(
      `INSERT INTO categories (user_id, name, kind, color)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, input.name, input.kind, input.color],
    );
    return rows[0]!;
  }

  async createMany(userId: string, inputs: ReadonlyArray<CreateCategoryInput>): Promise<void> {
    if (inputs.length === 0) return;
    const values: string[] = [];
    const params: unknown[] = [userId];
    for (const input of inputs) {
      params.push(input.name, input.kind, input.color);
      const n = params.length;
      values.push(`($1, $${n - 2}, $${n - 1}, $${n})`);
    }
    await this.db.query(
      `INSERT INTO categories (user_id, name, kind, color) VALUES ${values.join(', ')}`,
      params,
    );
  }

  async update(userId: string, id: string, input: UpdateCategoryInput): Promise<CategoryRow | null> {
    const set = setClause({ name: input.name, color: input.color }, 3);
    const { rows } = await this.db.query<CategoryRow>(
      `UPDATE categories SET ${set.sql} WHERE user_id = $1 AND id = $2 RETURNING *`,
      [userId, id, ...set.params],
    );
    return rows[0] ?? null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      'DELETE FROM categories WHERE user_id = $1 AND id = $2',
      [userId, id],
    );
    return rowCount > 0;
  }
}
