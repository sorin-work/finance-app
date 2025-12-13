import { ApiError, api } from './client';
import type { User } from './types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  currency: string;
}

/** The signed-in user, or null when there is no valid session. */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    return (await api.get<{ user: User }>('/auth/me')).user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export async function login(email: string, password: string): Promise<User> {
  return (await api.post<{ user: User }>('/auth/login', { email, password })).user;
}

export async function register(payload: RegisterPayload): Promise<User> {
  return (await api.post<{ user: User }>('/auth/register', payload)).user;
}

export function logout(): Promise<void> {
  return api.post<void>('/auth/logout');
}
