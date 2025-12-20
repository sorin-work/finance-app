// Dates are YYYY-MM-DD strings and months YYYY-MM strings, matching the API.

/** Today's date in the user's local timezone, as YYYY-MM-DD. */
export function today(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function currentMonth(now: Date = new Date()): string {
  return today(now).slice(0, 7);
}

/** "2025-12-20" -> "Dec 20, 2025" */
export function formatDate(date: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}
