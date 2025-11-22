import { describe, expect, it, vi } from 'vitest';
import { signSessionToken, verifySessionToken } from './tokens.js';

const SECRET = 'a-test-secret-that-is-at-least-32-chars';

describe('session tokens', () => {
  it('round-trips the user id', () => {
    const token = signSessionToken('user-1', SECRET, 7);
    expect(verifySessionToken(token, SECRET)).toBe('user-1');
  });

  it('returns null for garbage', () => {
    expect(verifySessionToken('not.a.jwt', SECRET)).toBeNull();
  });

  it('returns null once the token has expired', () => {
    vi.useFakeTimers();
    try {
      const token = signSessionToken('user-1', SECRET, 1);
      vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
      expect(verifySessionToken(token, SECRET)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
