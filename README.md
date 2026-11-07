# finance-app

A personal finance manager for keeping track of accounts, spending and income.

- **Accounts**: checking, savings, credit cards, cash, investments and loans, with live balances
- **Transactions**: income, expenses and transfers, with search, filters, CSV import and export
- **Categories**: a sensible default set on signup, fully editable
- **Budgets**: monthly limits per category with progress and overspend warnings
- **Recurring transactions**: rent, salary and subscriptions added automatically
- **Goals**: savings targets with the monthly amount needed to hit them on time
- **Reports**: cash flow, spending by category and net worth over time

## Stack

| Part       | Tech                                                         |
| ---------- | ------------------------------------------------------------ |
| API        | Node 22, Express 5, TypeScript, PostgreSQL (`pg`), Zod       |
| Web        | React 19, Vite, React Router, TanStack Query                 |
| Tests      | Vitest, Supertest, PGlite (in-memory Postgres for API tests) |
| Repo setup | npm workspaces (`apps/api`, `apps/web`)                      |

## Getting started

You need Node 22+ and a PostgreSQL 15+ database (or Docker, see below).

```bash
npm install

# API configuration
cp apps/api/.env.example apps/api/.env
# then edit DATABASE_URL and JWT_SECRET

# Starts the API on :4000 and the web app on :5173
npm run dev
```

Open http://localhost:5173 and create an account. The API applies database
migrations automatically when it starts.

## Running with Docker

The quickest way to try the app: Postgres, the API and the web app (served by
nginx) in one command.

```bash
docker compose up --build
```

Then open http://localhost:8080 and sign in with the demo account:

- **Email:** `demo@example.com`
- **Password:** `demo-password`

The demo user is created on first start with a year of transactions, five
accounts, recurring bills, savings goals and budgets for the last few months. Set `SEED_DEMO=false` to start
with an empty database instead.

| Service | URL / port            | Notes                                |
| ------- | --------------------- | ------------------------------------ |
| web     | http://localhost:8080 | nginx; proxies `/api` to the API     |
| api     | http://localhost:4000 | Express API                          |
| db      | `localhost:5432`      | Postgres 17, user/password `finance` |

Ports can be changed with `WEB_PORT`, `API_PORT` and `DB_PORT`, e.g.
`WEB_PORT=3000 docker compose up`. Data lives in the `db-data` volume; remove it
with `docker compose down -v` to start fresh.

For day-to-day development you can run only the database in Docker and the apps
on your machine:

```bash
docker compose up -d db
npm run dev
```

## Scripts

Run from the repository root:

| Command                    | What it does                         |
| -------------------------- | ------------------------------------ |
| `npm run dev`              | API and web app in watch mode        |
| `npm test`                 | All unit and route tests             |
| `npm run typecheck`        | TypeScript checks for both apps      |
| `npm run lint`             | ESLint                               |
| `npm run build`            | Production builds (`apps/*/dist`)    |
| `npm run seed -w apps/api` | Create the demo user and sample data |

## Project layout

```
apps/
  api/
    migrations/        SQL migrations, applied in filename order
    src/
      db/              connection, migration runner
      lib/             money, dates, validation and error helpers
      middleware/      auth, rate limiting, request ids and error handling
      seed/            demo data
      modules/<name>/  routes, service, repository and schemas per feature
    test/              test helpers (PGlite database, app factory)
  web/
    src/
      api/             typed API client
      components/      shared UI (forms, charts, modal…)
      hooks/           data and UI hooks
      pages/           one component per route
docs/                  API reference and architecture notes
```

## Documentation

- [docs/api.md](docs/api.md): every endpoint, request body and response
- [docs/architecture.md](docs/architecture.md): how the pieces fit together

## Configuration

The API reads its settings from environment variables (or `apps/api/.env`):

| Variable                     | Default    | Notes                                                              |
| ---------------------------- | ---------- | ------------------------------------------------------------------ |
| `DATABASE_URL`               | (required) | `postgres://user:password@host:5432/db`                            |
| `JWT_SECRET`                 | (required) | At least 32 characters, e.g. `openssl rand -hex 32`                |
| `PORT`                       | `4000`     |                                                                    |
| `LOG_LEVEL`                  | `info`     | `debug`, `info`, `warn`, `error`, `silent`…                        |
| `SESSION_TTL_DAYS`           | `7`        | How long a login lasts                                             |
| `COOKIE_SECURE`              | `false`    | Set to `true` when serving over HTTPS                              |
| `BCRYPT_ROUNDS`              | `12`       | Password hashing cost                                              |
| `AUTH_RATE_LIMIT`            | `20`       | Login/signup attempts per IP per 15 minutes                        |
| `RECURRING_INTERVAL_MINUTES` | `60`       | How often due recurring transactions are created; `0` turns it off |
| `SEED_DEMO`                  | `false`    | Create the demo user on startup                                    |

## Conventions

- **Money** is stored and sent as integer minor units (cents). `1234` means 12.34
  in the user's currency. Never use floats for amounts.
- **Dates** are plain `YYYY-MM-DD` strings with no timezone.
- API errors look like `{ "error": { "code": "not_found", "message": "Account not found" } }`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).

## Troubleshooting

**`Invalid environment: JWT_SECRET: ...` on startup.** Copy
`apps/api/.env.example` to `apps/api/.env` and set a secret of at least 32
characters.

**Signed in, but every request returns 401.** Over plain HTTP the session
cookie must not be marked secure. Keep `COOKIE_SECURE=false` unless the app is
behind HTTPS.

**`port is already allocated` from Docker.** Something else is using 8080, 4000
or 5432. Pick other ports: `WEB_PORT=8081 API_PORT=4001 DB_PORT=5433 docker compose up`.

**The web container shows 502 for a few seconds.** The API runs migrations
before it starts listening; nginx starts once the API reports healthy.

**Start over with a clean database.** `docker compose down -v` removes the
`db-data` volume; the next `docker compose up` recreates it (and the demo user).

**Recurring transactions did not appear.** They are created on startup and then
every `RECURRING_INTERVAL_MINUTES`. Use “Add due now” on the Recurring page to
run them immediately.
