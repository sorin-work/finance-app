# API reference

All endpoints live under `/api` and speak JSON. Everything except `/api/health`
and the signup/login endpoints needs a session.

## Conventions

- **Authentication**: `POST /api/auth/login` and `/register` set an HTTP-only
  `fa_session` cookie. Scripts can send the same JWT as
  `Authorization: Bearer <token>` instead.
- **Money** is an integer number of minor units (cents) in the user's currency:
  `1250` is 12.50. Transaction and budget amounts are always positive; the
  transaction `type` gives the direction.
- **Dates** are `YYYY-MM-DD`, **months** are `YYYY-MM`. No timezones.
- **Errors** share one shape:

  ```json
  {
    "error": {
      "code": "validation_error",
      "message": "Invalid request",
      "issues": [{ "path": "amount", "message": "..." }]
    }
  }
  ```

  | Status | `code`                                | When                                 |
  | ------ | ------------------------------------- | ------------------------------------ |
  | 400    | `validation_error`, `bad_request`     | The request body or query is invalid |
  | 401    | `unauthorized`, `invalid_credentials` | No/expired session, wrong login      |
  | 404    | `not_found`                           | Unknown id (or another user's)       |
  | 409    | `conflict`                            | Duplicate name, account still in use |
  | 429    | `rate_limited`                        | Too many login/signup attempts       |

## Health

| Method | Path          | Response                                      |
| ------ | ------------- | --------------------------------------------- |
| GET    | `/api/health` | `{ "status": "ok", "database": "up" }` or 503 |

## Auth and profile

| Method | Path                     | Body                                   | Response       |
| ------ | ------------------------ | -------------------------------------- | -------------- |
| POST   | `/api/auth/register`     | `{ email, password, name, currency? }` | 201 `{ user }` |
| POST   | `/api/auth/login`        | `{ email, password }`                  | `{ user }`     |
| POST   | `/api/auth/logout`       |                                        | 204            |
| GET    | `/api/auth/me`           |                                        | `{ user }`     |
| PATCH  | `/api/users/me`          | `{ name?, currency? }`                 | `{ user }`     |
| POST   | `/api/users/me/password` | `{ currentPassword, newPassword }`     | 204            |
| DELETE | `/api/users/me`          | `{ password }`                         | 204            |

Passwords need at least 8 characters. Supported currencies: USD, EUR, GBP, CAD,
AUD, NZD, CHF, SEK, NOK, DKK, PLN, CZK, RON.

## Accounts

| Method | Path                | Body                                                    |
| ------ | ------------------- | ------------------------------------------------------- |
| GET    | `/api/accounts`     |                                                         |
| POST   | `/api/accounts`     | `{ name, type, openingBalance? }`                       |
| GET    | `/api/accounts/:id` |                                                         |
| PATCH  | `/api/accounts/:id` | `{ name?, type?, openingBalance?, archived? }`          |
| DELETE | `/api/accounts/:id` | 409 if the account has transactions; archive it instead |

`type` is one of `checking`, `savings`, `credit_card`, `cash`, `investment`,
`loan`. Each account comes back with its current `balance`. Archived accounts
still count towards net worth but cannot receive new transactions.

## Categories

| Method | Path                  | Body                              |
| ------ | --------------------- | --------------------------------- |
| GET    | `/api/categories`     |                                   |
| POST   | `/api/categories`     | `{ name, kind, color? }`          |
| PATCH  | `/api/categories/:id` | `{ name?, color? }`               |
| DELETE | `/api/categories/:id` | transactions become uncategorized |

`kind` is `income` or `expense`. Names are unique per kind, ignoring case.

## Transactions

| Method | Path                       | Notes                                  |
| ------ | -------------------------- | -------------------------------------- |
| GET    | `/api/transactions`        | Filters below; paginated               |
| POST   | `/api/transactions`        | Create                                 |
| GET    | `/api/transactions/:id`    |                                        |
| PATCH  | `/api/transactions/:id`    | Any subset of the create fields        |
| DELETE | `/api/transactions/:id`    |                                        |
| GET    | `/api/transactions/export` | CSV download, same filters as the list |
| POST   | `/api/transactions/import` | `{ accountId, csv, dateFormat? }`      |

Create body:

```json
{
  "type": "expense",
  "accountId": "…",
  "amount": 5420,
  "date": "2026-06-01",
  "categoryId": "…",
  "payee": "FreshMart",
  "notes": ""
}
```

For `"type": "transfer"` send `transferAccountId` (the destination) and no
category.

List filters (query string): `from`, `to`, `accountId` (matches either side of a
transfer), `categoryId`, `type`, `q` (searches payee and notes), `page`
(default 1) and `pageSize` (default 50, max 200). The response is
`{ items, total, page, pageSize }`, newest first.

**Import** accepts a header row with a date column and either `amount`
(negative = spending) or `debit`/`credit` columns; `payee`/`description`,
`notes`/`memo` and `category` are optional. `dateFormat` is `YMD` (default),
`MDY` or `DMY`. Rows already present (same date, amount and payee) are
skipped. Response: `{ imported, skipped: [{ line, reason }] }`.

## Budgets

| Method | Path                | Body / query                                        |
| ------ | ------------------- | --------------------------------------------------- |
| GET    | `/api/budgets`      | `?month=YYYY-MM`                                    |
| PUT    | `/api/budgets`      | `{ categoryId, month, amount }` (create or replace) |
| POST   | `/api/budgets/copy` | `{ from, to, overwrite? }`                          |
| DELETE | `/api/budgets/:id`  |                                                     |

`GET` returns `{ month, totals: { budgeted, spent, remaining }, budgets }` where
each budget has `spent`, `remaining`, `percent` and `status`
(`on_track`, `warning` from 80%, or `over`).

## Recurring transactions

| Method | Path                 | Body                                                               |
| ------ | -------------------- | ------------------------------------------------------------------ |
| GET    | `/api/recurring`     |                                                                    |
| POST   | `/api/recurring`     | transaction fields + `{ frequency, startDate, endDate?, active? }` |
| PATCH  | `/api/recurring/:id` | any subset                                                         |
| DELETE | `/api/recurring/:id` | generated transactions are kept                                    |
| POST   | `/api/recurring/run` | creates everything due for the current user: `{ created }`         |

`frequency`: `daily`, `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly`.
The API also processes due rules on a timer (`RECURRING_INTERVAL_MINUTES`).
Monthly rules keep their day of the month: one starting on the 31st runs on the
last day of shorter months.

## Goals

| Method | Path                           | Body                                                        |
| ------ | ------------------------------ | ----------------------------------------------------------- |
| GET    | `/api/goals`                   |                                                             |
| POST   | `/api/goals`                   | `{ name, targetAmount, savedAmount?, targetDate?, color? }` |
| PATCH  | `/api/goals/:id`               | `{ name?, targetAmount?, targetDate?, color? }`             |
| POST   | `/api/goals/:id/contributions` | `{ amount }` (negative to withdraw)                         |
| DELETE | `/api/goals/:id`               |                                                             |

Goals include `progress`, `completed`, `remaining`, `monthsLeft`,
`monthlyNeeded` and `overdue`.

## Reports

| Method | Path                     | Query                              |
| ------ | ------------------------ | ---------------------------------- |
| GET    | `/api/reports/summary`   | `month` (default: this month)      |
| GET    | `/api/reports/cashflow`  | `end`, `months` (1-36, default 12) |
| GET    | `/api/reports/net-worth` | `end`, `months`                    |

Transfers are left out of income and spending totals.
