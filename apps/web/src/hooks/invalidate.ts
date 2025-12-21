import type { QueryClient } from '@tanstack/react-query';

/**
 * Refetch everything derived from transactions (lists, balances, totals)
 * after a write. Auth and category data are left alone.
 */
export function invalidateFinancialData(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => !['auth', 'categories'].includes(String(query.queryKey[0])),
  });
}
