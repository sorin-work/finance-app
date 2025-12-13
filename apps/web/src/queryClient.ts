import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/client';
import { ME_QUERY_KEY } from './auth/AuthContext';

export function createQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        // The session expired or was revoked: fall back to the login screen.
        if (error instanceof ApiError && error.status === 401) {
          queryClient.setQueryData(ME_QUERY_KEY, null);
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      },
    },
  });
  return queryClient;
}
