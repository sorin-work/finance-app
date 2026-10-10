import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { currentMonth } from '../lib/dates';
import { useMonthParam } from './useMonthParam';

function wrapper(route: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  );
}

describe('useMonthParam', () => {
  it('reads the month from the query string', () => {
    const { result } = renderHook(() => useMonthParam(), { wrapper: wrapper('/b?month=2026-03') });
    expect(result.current[0]).toBe('2026-03');
  });

  it('falls back to the current month for missing or bad values', () => {
    for (const route of ['/b', '/b?month=2026-13', '/b?month=march']) {
      const { result } = renderHook(() => useMonthParam(), { wrapper: wrapper(route) });
      expect(result.current[0]).toBe(currentMonth());
    }
  });

  it('updates the month', () => {
    const { result } = renderHook(() => useMonthParam(), { wrapper: wrapper('/b?month=2026-03') });
    act(() => result.current[1]('2026-04'));
    expect(result.current[0]).toBe('2026-04');
  });
});
