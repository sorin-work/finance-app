import { api } from './client';
import type { User } from './types';

export async function updateProfile(input: { name?: string; currency?: string }): Promise<User> {
  return (await api.patch<{ user: User }>('/users/me', input)).user;
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return api.post<void>('/users/me/password', { currentPassword, newPassword });
}

export async function deleteAccount(password: string): Promise<void> {
  const res = await fetch('/api/users/me', {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message ?? 'Could not delete the account');
  }
}
