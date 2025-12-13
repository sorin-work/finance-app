import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import type { User } from '../api/types';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

interface AuthState {
  user: User | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (email: string, password: string) => Promise<User>;
  register: (payload: authApi.RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: authApi.fetchCurrentUser,
    staleTime: Infinity,
  });

  const signedIn = useCallback(
    (user: User) => {
      // Drop anything cached for a previous user before showing the new one.
      queryClient.clear();
      queryClient.setQueryData(ME_QUERY_KEY, user);
      return user;
    },
    [queryClient],
  );

  const value = useMemo<AuthState>(() => {
    const user = me.data ?? null;
    return {
      user,
      status: me.isPending ? 'loading' : user ? 'authenticated' : 'anonymous',
      login: async (email, password) => signedIn(await authApi.login(email, password)),
      register: async (payload) => signedIn(await authApi.register(payload)),
      logout: async () => {
        await authApi.logout();
        queryClient.clear();
        queryClient.setQueryData(ME_QUERY_KEY, null);
      },
    };
  }, [me.data, me.isPending, queryClient, signedIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** The signed-in user. Only use inside routes that require authentication. */
export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useUser called without a signed-in user');
  return user;
}
