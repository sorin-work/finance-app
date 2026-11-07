# Architecture

## Overview

```
browser ──► nginx (web container) ──► /api/* ──► Express API ──► PostgreSQL
               └─ static React build
```

In development Vite plays nginx's part: it serves the React app on :5173 and
proxies `/api` to the API on :4000. Either way the browser only talks to one
origin, so the session cookie is first-party and no CORS setup is needed.

## API (`apps/api`)

Each feature lives in `src/modules/<name>/` and is split the same way:

| File              | Responsibility                                                    |
| ----------------- | ----------------------------------------------------------------- |
| `*.schemas.ts`    | Zod schemas for request bodies and query strings                  |
| `*.routes.ts`     | Express router: parse input, call the service, shape the response |
| `*.service.ts`    | Business rules (ownership checks, validation that needs the DB)   |
| `*.repository.ts` | SQL. Converts between snake_case rows and camelCase objects       |

Pure calculations that are worth testing on their own sit next to them, e.g.
`budgets/progress.ts`, `recurring/schedule.ts`, `goals/projection.ts` and
`reports/calculations.ts`.

**Requests.** `app.ts` wires middleware in this order: request id → pino HTTP
logging → JSON body parser → cookies → routes → JSON 404 → error handler. Zod
errors, `HttpError`s, malformed bodies and Postgres constraint violations are
all turned into the same `{ error: { code, message } }` shape by
`middleware/error-handler.ts`.

**Auth.** Passwords are hashed with bcrypt. Login sets a JWT (HS256, 7 days by
default) in an HTTP-only `SameSite=Lax` cookie; `requireAuth` also accepts it as
a bearer token for scripts. Every query is scoped by `user_id`, and looking up
another user's record returns 404 rather than 403 so ids can't be probed.

**Database access.** `db/types.ts` defines a tiny `Database` interface
(`query`, `exec`, `transaction`). Production uses node-postgres; tests use
PGlite (Postgres compiled to WebAssembly) through the same interface, so the
real SQL and migrations run in every test without Docker. Both are configured
to return `BIGINT` as numbers and `DATE` as `YYYY-MM-DD` strings.

**Migrations** are plain SQL files in `apps/api/migrations`, applied in name
order on startup inside one transaction guarded by an advisory lock. Never edit
a migration that has shipped; add a new one.

**Money and dates.** Amounts are integer cents everywhere (`BIGINT` columns,
integer JSON). Balances are not stored; they are computed from the opening
balance and transactions. Dates are calendar dates without timezones; "today"
on the server is the UTC date.

**Recurring transactions.** `recurring/scheduler.ts` runs
`RecurringService.processDue()` on startup and every
`RECURRING_INTERVAL_MINUTES`. Due rules are selected with
`FOR UPDATE SKIP LOCKED`, so several API instances can run the timer without
creating duplicates. Month-based rules remember the day of the month they
started on (a rule on the 31st runs on Feb 28 and then Mar 31 again).

## Web (`apps/web`)

- `src/api/`: one module per resource with typed fetch functions. `client.ts`
  turns error responses into `ApiError`s.
- Server state lives in TanStack Query. After a write,
  `hooks/invalidate.ts` refetches everything derived from transactions
  (balances, budgets, reports) in one go.
- `auth/AuthContext.tsx` keeps the current user in the query cache; any 401
  from any query drops the user back to the login page.
- Pages behind the login are lazy-loaded (`App.tsx`), so the charting library
  only downloads with the dashboard and reports.
- Styling is plain CSS with custom properties in `styles.css`; dark mode swaps
  the variables.

## Testing

| Where                          | What                                                            |
| ------------------------------ | --------------------------------------------------------------- |
| `apps/api/src/**/*.test.ts`    | Pure helpers, plus route tests through Supertest against PGlite |
| `apps/web/src/**/*.test.ts(x)` | Helpers and components with Testing Library on jsdom            |

Route tests build the real Express app with `test/app.ts` and register users
through the API, so they cover validation, auth and SQL together.
