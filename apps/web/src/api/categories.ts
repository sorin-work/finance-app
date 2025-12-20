import { api } from './client';
import type { Category, CategoryKind } from './types';

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
  color: string;
}

export async function fetchCategories(): Promise<Category[]> {
  return (await api.get<{ categories: Category[] }>('/categories')).categories;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  return (await api.post<{ category: Category }>('/categories', input)).category;
}

export async function updateCategory(
  id: string,
  input: Partial<Omit<CategoryInput, 'kind'>>,
): Promise<Category> {
  return (await api.patch<{ category: Category }>(`/categories/${id}`, input)).category;
}

export function deleteCategory(id: string): Promise<void> {
  return api.delete(`/categories/${id}`);
}
