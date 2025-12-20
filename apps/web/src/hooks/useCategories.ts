import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '../api/categories';

export const CATEGORIES_KEY = ['categories'] as const;

export function useCategories() {
  return useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchCategories, staleTime: 5 * 60_000 });
}
