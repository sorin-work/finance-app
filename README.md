# finance-app

A personal finance manager for keeping track of accounts, spending and income.

- **Accounts**: checking, savings, credit cards, cash, investments and loans, with live balances
- **Transactions**: income, expenses and transfers between accounts, with filters and pagination
- **Categories**: a sensible default set on signup, fully editable

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
accounts and budgets for the last few months. Set `SEED_DEMO=false` to start
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
      middleware/      auth and error handling
      modules/<name>/  routes, service, repository and schemas per feature
    test/              test helpers (PGlite database, app factory)
  web/
    src/
      api/             typed API client
      components/      shared UI
      pages/           one component per route
```

## Conventions

- **Money** is stored and sent as integer minor units (cents). `1234` means 12.34
  in the user's currency. Never use floats for amounts.
- **Dates** are plain `YYYY-MM-DD` strings with no timezone.
- API errors look like `{ "error": { "code": "not_found", "message": "Account not found" } }`.
