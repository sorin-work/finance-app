# Changelog

## 1.0.0 (2026-11-08)

First stable release.

### Features

- Accounts with live balances, archiving, and net worth across assets and liabilities
- Income, expense and transfer transactions with search, filters and pagination
- CSV export, and CSV import that understands common bank formats and skips rows already imported
- Payee suggestions that also fill in the category used last time
- Monthly budgets per category with progress, overspend warnings and copying from the previous month
- Recurring transactions (daily to yearly) created automatically by the API
- Savings goals with contributions, withdrawals and the monthly amount needed to finish on time
- Reports: monthly summary, cash flow and net worth history with charts
- Profile, password change and account deletion
- Dark mode and a layout that works on phones
- Demo user with a year of sample data (`SEED_DEMO=true`, on by default in Docker)
- Docker Compose setup with health checks

### Fixes since the first previews

- Spending on the last day of a month was missing from budgets and the monthly summary
- Monthly recurring rules that started on the 29th–31st drifted to an earlier day after short months
- Transfers to the same account were accepted
- Changing page in the transactions list dropped the active filters
- Amount fields rejected values with thousands separators such as `1,234.56`
- Withdrawing more than a goal held returned a 500 instead of a validation error
- The cash flow report left out months without transactions
- With an account filter, transfers into that account were not shown as money in

### Security

- Login and signup are rate limited per IP
- Session cookies are HTTP-only and `SameSite=Lax`; set `COOKIE_SECURE=true` behind HTTPS
- Every response carries an `X-Request-Id`, which also appears in error bodies and logs
