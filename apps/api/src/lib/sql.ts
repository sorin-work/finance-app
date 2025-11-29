/**
 * Builds the `SET a = $n, b = $n+1` part of an UPDATE from an object whose
 * keys are column names. Undefined values are skipped so PATCH payloads only
 * touch the fields that were sent. Column names must never come from user input.
 */
export function setClause(
  columns: Record<string, unknown>,
  firstParamIndex = 1,
): { sql: string; params: unknown[] } {
  const assignments: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of Object.entries(columns)) {
    if (value === undefined) continue;
    params.push(value);
    assignments.push(`${column} = $${firstParamIndex + params.length - 1}`);
  }
  assignments.push('updated_at = now()');
  return { sql: assignments.join(', '), params };
}
