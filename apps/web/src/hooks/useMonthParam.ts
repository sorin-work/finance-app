import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { currentMonth } from '../lib/dates';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * The month shown by a page, kept in the `?month=` query parameter so it
 * survives reloads and can be shared. Falls back to the current month when
 * the parameter is missing or malformed.
 */
export function useMonthParam(): [string, (month: string) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('month');
  const month = raw && MONTH.test(raw) ? raw : currentMonth();

  const setMonth = useCallback(
    (next: string) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          if (next === currentMonth()) updated.delete('month');
          else updated.set('month', next);
          return updated;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return [month, setMonth];
}
