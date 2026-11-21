# Roadmap

Things I might add to finance-app. The app covers the everyday loop (accounts, transactions,
CSV import, budgets, recurring bills, goals and reports), so nothing here is promised or
scheduled. These are ideas, written down with enough detail that I (or anyone else) can pick one
up later without starting from zero. Items may change, move between groups or be dropped.

What the app does today is in the [README](README.md), the [API reference](docs/api.md) and the
[architecture notes](docs/architecture.md).

- **Next**: small or well understood. I would start with these.
- **Later**: worth doing, but bigger or waiting on a decision.
- **Maybe**: not sure yet that they are worth the extra complexity.

Sizes are rough: **S** is an evening or two, **M** a few evenings up to a couple of weekends,
**L** several weeks of spare time.

Each item is meant to fit in one pull request and to be covered by the tests. API tests sit next
to the code they test (`apps/api/src/**/*.test.ts`): pure helpers such as `budgets/progress.ts`,
`recurring/schedule.ts`, `goals/projection.ts` and `reports/calculations.ts` have unit tests,
and route tests build the real app with `apps/api/test/app.ts` and call it through Supertest
against PGlite, so SQL and migrations run in every test. So a calculation worth testing on its
own belongs in a pure module next to the service, not inside a repository or a route. Web tests
use Testing Library on jsdom (`apps/web/src/**/*.test.tsx`), and logic there belongs in
`apps/web/src/lib`. Most items add columns, and each brings its own SQL file under
`apps/api/migrations` (the next free number is `011`). File names below are relative to
`apps/api/src/` unless they start with `apps/web/`, `apps/api/migrations/` or `docs/`.

When an item ships, its row in the overview says `Shipped`, its section moves under a
`## Shipped` heading at the end with one paragraph on what was built and what was left out, and
the same pull request updates the README, the notes under `docs/` and an entry under
`## Unreleased` at the top of the [CHANGELOG](CHANGELOG.md) (the heading is added by the first
item that needs it).

"Depends on" lists real prerequisites only. Items that merely touch the same file are not listed
there; the bigger overlaps are mentioned in the items.

## Overview

| #   | Item                                              | Group | Area          | Size | Depends on |
| --- | ------------------------------------------------- | ----- | ------------- | ---- | ---------- |
| 1   | Sessions that really end                          | Next  | auth          | S    | -          |
| 2   | Imports that keep real duplicates, with a preview | Next  | import        | M    | -          |
| 3   | Today in the user's time zone                     | Next  | dates         | S    | -          |
| 4   | Archived accounts and recurring rules             | Next  | recurring     | S    | -          |
| 5   | Split transactions                                | Next  | transactions  | M    | -          |
| 6   | Transfers recognised on import                    | Later | import        | M    | 2          |
| 7   | Category rules                                    | Later | import        | M    | -          |
| 8   | Tags                                              | Later | transactions  | S    | -          |
| 9   | Bulk edits in the transactions list               | Later | transactions  | M    | -          |
| 10  | Undo for deletes                                  | Later | transactions  | S    | -          |
| 11  | Budgets that carry over                           | Later | budgets       | M    | -          |
| 12  | Upcoming bills and a cash flow forecast           | Later | recurring     | M    | -          |
| 13  | Recurring transactions that wait for a review     | Later | recurring     | S    | -          |
| 14  | Goals with history and a linked account           | Later | goals         | M    | -          |
| 15  | Reconciling against a statement                   | Later | accounts      | M    | -          |
| 16  | Balance updates for accounts that change in value | Later | accounts      | S    | -          |
| 17  | OFX and QIF import                                | Later | import        | M    | -          |
| 18  | Full export and restore                           | Later | data          | M    | -          |
| 19  | Reports with custom ranges and comparisons        | Later | reports       | M    | -          |
| 20  | Two-step sign-in                                  | Later | auth          | M    | -          |
| 21  | Email delivery and budget alerts                  | Later | notifications | M    | -          |
| 22  | Password reset                                    | Later | auth          | S    | 21         |
| 23  | Hardening the Docker setup                        | Later | security      | S    | -          |
| 24  | Backups and restore                               | Later | ops           | S    | -          |
| 25  | Accessibility pass                                | Later | ui            | M    | -          |
| 26  | Tests for the pages                               | Later | tests         | M    | -          |
| 27  | Faster with years of data                         | Later | performance   | M    | -          |
| 28  | Several currencies                                | Maybe | accounts      | L    | -          |
| 29  | Investments: holdings and prices                  | Maybe | accounts      | L    | -          |
| 30  | Loans with interest                               | Maybe | accounts      | M    | -          |
| 31  | Receipts and attachments                          | Maybe | transactions  | M    | -          |
| 32  | A shared household                                | Maybe | users         | L    | -          |
| 33  | Personal API tokens                               | Maybe | api           | S    | 1          |
| 34  | Translations                                      | Maybe | ui            | M    | -          |
| 35  | Installable app                                   | Maybe | ui            | M    | -          |
| 36  | Rate limits shared by several instances           | Maybe | ops           | S    | -          |
| 37  | A metrics endpoint                                | Maybe | ops           | S    | -          |

## Next

### 1. Sessions that really end

A login is a JWT in the `fa_session` cookie, valid for `SESSION_TTL_DAYS` and checked only by its
signature (`verifySessionToken` in `modules/auth/tokens.ts`). Nothing on the server remembers it.
So:

- "Sign out" (`POST /api/auth/logout`) clears the cookie in that browser. Anyone who copied the
  token can keep using it for a week.
- Changing the password (`UsersService.changePassword`) leaves every other session signed in,
  which is the one thing people expect a password change to do after a lost phone.
- Deleting the account leaves the token valid until it expires; it only works because every query
  finds nothing for a missing user.

For an app that holds someone's whole financial history that is the first gap to close.

- Data: a `sessions` table (`id`, `user_id`, `created_at`, `last_seen_at`, `expires_at`,
  `user_agent`, `revoked_at`). The token carries the session id as `jti`.
- `requireAuth` checks the session row: not revoked, not expired. That is one primary key lookup
  per request. `last_seen_at` is only written when it is more than a few minutes old, so a busy
  page does not turn every read into a write.
- Logout revokes the current session. A password change revokes all others and keeps the current
  one. Account deletion removes them all through the cascade.
- Settings gets a "Signed in devices" list with "Sign out" per row and "Sign out everywhere else"
  (`apps/web/src/pages/SettingsPage.tsx`).
- Tricky: bearer tokens for scripts use the same check, so they are revoked the same way. That is
  right for now; item 33 adds tokens meant for scripts.
- Tricky: expired rows pile up. Delete them from the same timer that runs recurring transactions
  (`recurring/scheduler.ts`), or a separate one.
- Tests: `auth.routes.test.ts`: a token stops working after logout, after a password change (but
  the current one keeps working), after "sign out everywhere"; `users.routes.test.ts` for the
  device list.

### 2. Imports that keep real duplicates, with a preview

`TransactionsService.importCsv` skips a row when one with the same date, type, amount and payee
already exists in the account, so the same file can be imported twice. The same set also gets
every row of the file added as it goes (`existing.add(rowKey)`), so two genuine coffees for 3.20
at the same cafe on the same day become one coffee and one "Already imported". Bank exports
contain such pairs all the time, and the missing one shows up a month later as a balance that
does not match the bank.

The import also goes straight in. The dialog (`apps/web/src/components/ImportDialog.tsx`) uploads
the file and reports counts afterwards; a wrong date format (`YMD` or `DMY`) or a wrong account is
found only by looking at the transactions list and deleting by hand.

- Duplicates by count, not by presence: if the file has two matching rows and the account has
  one, import one. A pure `matchImport(existing, rows)` in `transactions/csv-import.ts` returns
  for each row "new" or "already imported", and is unit tested.
- A preview step: `POST /api/transactions/import/preview` parses and matches without writing,
  and returns the rows with their status, the category it would use and any problems. The dialog
  shows a table, lets the user untick rows, and then imports exactly the ticked rows.
- Tricky: the preview and the import must agree. The import takes the rows the client confirmed
  (as parsed rows, not the file again), and checks again that none was imported in between.
- Tricky: the 1.5 MB limit on the file. The preview answer for such a file is large; page it in
  the table, not in the API.
- Undecided: remembering the column layout and date format per account, so the second import
  from the same bank needs no choices. Small and useful; I would include it.
- Tests: unit tests for `matchImport` (pairs in the file, pairs already stored, mixed); route
  tests for the preview and for importing a subset.

### 3. Today in the user's time zone

The API's "today" is the UTC date (`todayISO` in `lib/dates.ts`, and the architecture notes say
so). The web app's `today()` and `currentMonth()` in `apps/web/src/lib/dates.ts` use the
browser's local date. For anyone far from UTC they disagree for several hours a day:

- in California on the evening of 31 March, the reports routes default to April
  (`currentMonth()` on the server), while the month picker shows March;
- recurring rules post by the UTC date, so in New Zealand the rent appears around midday on the
  1st, and in California the evening before;
- a transaction entered at 23:30 on the last day of the month, with the date filled in by the
  browser, is correct, but "this month" on the dashboard may already be the next one.

- A `timezone` column on `users` (an IANA name such as `Europe/Bucharest`), set from the browser
  on signup and editable in the profile form.
- A `todayFor(timezone)` helper in `lib/dates.ts` with `Intl.DateTimeFormat`, used wherever the
  API needs today for a user: report defaults, budgets for the current month, goal projections,
  and the recurring run.
- Recurring: `processDue` runs for all users with one date today. It needs a date per user. The
  simple way is to select due rules with the user's time zone joined in and compare
  `next_date <= (now() at time zone u.timezone)::date` in SQL.
- Tricky: tests pin "today" through the `today` parameter of `RecurringService`; keep that seam
  and add the time zone next to it.
- Tests: unit tests for `todayFor` around midnight and daylight saving changes; route tests for a
  user at UTC+13 and one at UTC-8 on the last day of a month.

### 4. Archived accounts and recurring rules

Archiving an account (`archived` in migration `009`) stops new transactions through
`checkTransactionReferences`, which refuses an archived account. Two cases fall through:

- recurring rules. `RecurringService.processDue` inserts occurrences without that check, so a
  rule on an account that was closed and archived keeps adding rent to it every month;
- editing old transactions. `TransactionsService.update` runs the same check, so changing the
  category of a transaction from last year in an archived account fails with '"Old card" is
  archived'. That blocks exactly the clean-up people do after closing an account.

Separately, `processDue` handles every due rule of every user in one database transaction. One
rule that fails (a constraint, a bad row) rolls back everyone's transactions, the scheduler logs
the error (`recurring/scheduler.ts`), and the same thing happens again every hour.

- Archiving an account pauses its rules (`active = false`) and says how many in the answer, and
  unarchiving offers to resume them. `processDue` also skips rules whose account or destination
  is archived, as a safety net.
- The reference check takes a flag: creating or moving a transaction into an archived account is
  refused, changing other fields of a transaction already there is allowed.
- `processDue` runs each rule in its own transaction (the `FOR UPDATE SKIP LOCKED` select
  per rule still works), logs a failing rule with its id, and carries on.
- Tests: route tests for archiving with rules, editing an old transaction on an archived account,
  and `processDue` with one broken rule among good ones.

### 5. Split transactions

A transaction has one category. A supermarket receipt with food, cleaning products and a
birthday present is either one wrong category or three hand-made transactions that no longer
match the bank. Splits are one of the most requested features in every budgeting app I looked at.

- Data: `transaction_splits` (`transaction_id`, `category_id`, `amount`, `notes`). A split
  transaction keeps its full amount on the parent row (so balances in
  `AccountsRepository.balances` do not change) and has no category of its own; the splits must
  add up to the parent's amount.
- Everything that groups by category reads splits instead of the parent when there are any:
  budget spending (`budgets.repository.ts`), the spending by category in the monthly summary
  (`TransactionsRepository.spendingByCategory`), reports and the CSV export. One SQL view,
  `categorized_amounts`, that yields one row per category and amount for both kinds avoids
  repeating the rule in four places.
- Splits follow the parent's type: income splits use income categories, as
  `checkTransactionReferences` already enforces for the parent.
- UI: "Split" in `TransactionForm.tsx` turns the category field into rows of category and amount
  with the remainder shown live; the list shows "3 categories".
- Tricky: editing the parent's amount when it has splits. Refuse until the splits add up again,
  rather than guessing which split absorbs the difference.
- Tricky: export and import. The export writes one line per split with the parent's other fields,
  and the import does not create splits; say so in `docs/api.md`.
- Tests: a pure `validateSplits(amount, splits)`; route tests for create and edit, budgets and the
  monthly summary counting splits, the export lines.

## Later

### 6. Transfers recognised on import

The import makes every row income or expense (`importCsv`: negative is an expense). Moving 500
from checking to savings appears in both bank files: once as an expense in checking and once as
income in savings. Imported into both accounts, income and spending both grow by 500, and the
cash flow report and budgets are off.

- After the preview from item 2 has matched duplicates, look for pairs: an outgoing row in this
  file and an incoming one of the same amount in another account of the user, within a few days.
  Offer to turn them into one transfer (`type = 'transfer'` with `transfer_account_id`).
- Pairs only in the other direction too: importing savings after checking finds the expense
  already stored in checking and offers to turn it into a transfer.
- A pure `findTransferPairs(rows, candidates, maxDays)` with unit tests.
- Tricky: two transfers of the same amount in one week. Match the closest dates first and show
  the pairs for confirmation; never merge without asking.
- Tests: unit tests for the pairing; a route test for importing into two accounts.

### 7. Category rules

The import matches categories only by the name in a "category" column, and the payee suggestions
fill in the category used last time (`TransactionsRepository.payeeSuggestions`). A bank file has
no category column, so every imported row arrives uncategorised and has to be fixed by hand.

- Rules: `category_rules` (`match` on payee or notes: contains, starts with or equals; an
  optional amount range; the category; an order). The first matching rule wins.
- Applied in the import preview (item 2, shown as "by rule") and offered when entering a
  transaction by hand.
- "Create a rule from this" when recategorising a transaction, with the payee filled in.
- A "run rules on uncategorised transactions" action with a preview of what would change.
- Tricky: plain strings only, no regular expressions entered by users; they are hard to get
  right and a bad one can be slow.
- Tests: a pure `applyRules(rules, row)`; route tests for the CRUD and for the import using them.

### 8. Tags

Categories answer "what kind of spending"; people also want "the holiday in Greece" or "the
kitchen renovation" across categories. Today the only way is a word in the notes and a search.

- `tags` and `transaction_tags`; a tag filter on `GET /api/transactions` and in the list; a
  report of spending per tag for a date range.
- The CSV export gets a tags column; the import reads one if present.
- Tests: route tests for tagging, filtering and the report.

### 9. Bulk edits in the transactions list

`TransactionsPage.tsx` edits one transaction at a time. After an import of 200 rows, setting the
category of 40 of them means 40 dialogs.

- Checkboxes in the list, "select all on this page" and "select all matching the filter", then
  "Set category", "Add tag" (with item 8), "Move to account" and "Delete".
- `POST /api/transactions/bulk` with the ids (or the filter) and one change, run in one
  transaction and checked with `checkTransactionReferences` per row. Answers with how many changed.
- Tricky: "all matching the filter" can be thousands of rows. The API applies the filter itself
  instead of receiving ids, with a cap and a count shown before the change.
- Tricky: transfers and income in a selection for an expense category. Skip rows the change does
  not fit and report them.
- Tests: route tests for each change, the filter form, mixed types; a component test for the
  selection.

### 10. Undo for deletes

Deleting a transaction, a budget or a recurring rule is immediate and permanent
(`TransactionsRepository.delete` and friends). A slip of the finger on a phone loses data with no
way back.

- Soft delete for transactions: `deleted_at`, filtered everywhere (balances, lists, budgets,
  reports). The toast after a delete has "Undo" for some seconds, and a "Recently deleted" view
  keeps them for 30 days.
- Tricky: every query that reads `transactions` must filter. A view or a repository helper, and
  a test that a deleted transaction leaves every total.
- Budgets and rules can use a plain undo (recreate from the deleted row returned by the API);
  they have no history worth keeping.
- Tests: route tests for delete, undo and the 30 day clean-up.

### 11. Budgets that carry over

A budget is a limit per category per month, and each month starts again
(`budgets/progress.ts`). For irregular spending (clothes, car repairs, gifts) people budget a
monthly amount and expect unspent money to stay available, and overspending to reduce next month.

- A `rollover` flag per budget category: available this month = this month's budget + what was
  left (or overspent) last month. `budgetProgress` gets the carried amount as an input and stays
  a pure function.
- Copying budgets to the next month (`POST /api/budgets/copy`) keeps the flag.
- Tricky: how far back to carry. Following the chain to the first month is simple and correct but
  grows with time; storing the carried amount when a month is viewed is faster but goes stale when
  an old transaction changes. Computing it with one SQL window over the months is probably fine.
- Undecided: income budgets ("I expect 3,000 salary") next to expense budgets, for a "left to
  budget" figure. Useful, but a second concept; I would leave it for later.
- Tests: unit tests for the carry over months with gaps and overspending; route tests.

### 12. Upcoming bills and a cash flow forecast

Recurring rules know exactly what is coming (rent on the 1st, salary on the 25th), but the app
only uses them to post transactions when they are due. "Can I afford this before payday" needs
the next weeks, not the last months.

- An "Upcoming" list on the dashboard: the next 30 days of occurrences from
  `recurring/schedule.ts`, with the running balance per account after each.
- A forecast line on the cash flow chart (`components/charts/CashflowChart.tsx`) for the next
  months from rules only, clearly marked as a forecast.
- A warning when an account is projected to go below zero.
- Tricky: rules with an end date and month-end anchors; `dueOccurrences` already handles both,
  so the forecast should call it rather than reimplementing.
- Tests: a pure `forecast(balances, rules, from, days)` with unit tests; a route test for the
  endpoint.

### 13. Recurring transactions that wait for a review

Every due rule posts a transaction with the rule's amount. Electricity, phone and card bills vary
each month, so the posted amount is wrong and has to be edited, or the bill is not set up as
recurring at all.

- A rule option "ask me": due occurrences become pending items ("Electricity, about 80, due
  today") on the dashboard and the recurring page, posted only when the user confirms the real
  amount or skips them.
- Pending items are rows in a small `recurring_pending` table, created by `processDue` instead of
  a transaction.
- Tricky: pending items that nobody confirms. They stay visible and count in the forecast (item 12) with the estimated amount.
- Tests: route tests for a pending item, confirm with another amount, skip; `processDue` tests for
  both kinds of rule.

### 14. Goals with history and a linked account

A goal's `saved_amount` is a number moved by contributions (`GoalsService.contribute`), with no
record of when money went in or out, and no link to where the money is. Saving 200 into the
holiday goal does not move money between accounts, and moving money into savings does not touch
the goal, so the two drift apart.

- `goal_contributions` (`goal_id`, `amount`, `date`, `note`) so the goal page shows a history,
  and `goals/projection.ts` can use the real pace instead of only the remaining amount.
- An optional linked account: the goal's progress is then the account's balance (or a share of
  it), and contributions are transfers into it.
- A migration turns each goal's current `saved_amount` into one opening contribution.
- Tricky: two goals on one savings account. Either allocate shares explicitly or allow only one
  goal per linked account. Allocating is more work and more honest; I lean towards it.
- Tests: projection unit tests with a history; route tests for contributions and for a linked
  account.

### 15. Reconciling against a statement

The only check that the app matches the bank is comparing the balance by eye. Once a difference
appears, finding the missing or doubled transaction is slow.

- A `cleared` flag per transaction, ticked in the list.
- "Reconcile" per account: enter the statement date and closing balance; the page shows cleared
  transactions up to that date, the difference, and the uncleared ones to tick. When the
  difference is zero, the cleared ones become `reconciled` and the date is stored.
- Editing or deleting a reconciled transaction asks for confirmation, because it changes a
  balance that was checked.
- Tests: route tests for a reconcile session; a unit test for the difference.

### 16. Balance updates for accounts that change in value

Balances come only from the opening balance and transactions. An investment account, a pension,
a house or a car changes value without transactions, so the net worth report
(`ReportsService.netWorth`) is only right if the user invents income and expense rows, which then
pollute the income and spending reports.

- "Update balance" on an account: enter today's value, and the app stores an adjustment of type
  `adjustment` that changes the balance but is left out of income, spending, budgets and cash
  flow.
- Net worth history uses adjustments on their dates, so the chart follows the valuations.
- Tricky: the type check on `transactions.type` has to allow the new type, and every report that
  sums income and expenses must ignore it. A test per report.
- Tests: route tests for an adjustment and for each report leaving it out.

### 17. OFX and QIF import

CSV import works, but every bank's CSV is a little different (`findColumns` guesses columns by
name). Many banks also offer OFX (or QFX), and older software exports QIF. Both have fixed fields,
and OFX gives every transaction a bank id (`FITID`) that makes duplicate detection exact.

- Parsers for both into the same row shape as `parseImportCsv`, so the preview from item 2 and
  rules from item 7 apply unchanged.
- OFX: store `FITID` on the transaction (`external_id`, unique per account when set) and use it
  instead of the date, amount and payee match.
- Tricky: OFX 1.x is SGML, not XML. A small tolerant parser for the transaction list is enough;
  no need for a library that understands the whole format.
- Tests: parser unit tests on sample files from a few banks; a route test for importing one.

### 18. Full export and restore

The CSV export holds transactions only (`GET /api/transactions/export`). Accounts with opening
balances, categories and colours, budgets, recurring rules and goals cannot be exported, so
moving to another server or keeping a personal backup is not possible from the app.

- `GET /api/users/me/export`: one JSON file with everything the user owns and a format version.
- `POST /api/users/me/import` into an empty account only (no merging), in one transaction, with
  new ids and the references mapped.
- Tricky: the format has to survive later migrations. A version number and a test that imports
  the output of the current export are the minimum.
- Tests: a round trip of the demo data (`seed/demo.ts`) through export and import, with balances
  and report totals equal before and after.

### 19. Reports with custom ranges and comparisons

The reports are per month: a monthly summary, cash flow and net worth for the last 1 to 36 months
(`reports.routes.ts`). Common questions do not fit: "how much did we spend on groceries this year
compared with last year", "who are my biggest payees", "spending per category over twelve
months".

- A date range on the summary instead of one month, with a "compare with the previous period"
  option.
- Category over time: one category's monthly spending for a year as a bar chart.
- Top payees for a range.
- Pure functions in `reports/calculations.ts` for the comparison and the shares, with unit tests.
- Tests: route tests for each report on the demo data with fixed dates.

### 20. Two-step sign-in

A password is the only factor. For a finance app an optional second step is expected.

- TOTP with an authenticator app: setup shows a QR code (generated in the browser from the
  `otpauth://` URL), confirmation with a first code, ten single-use recovery codes stored hashed.
- Login answers "code needed" and a short-lived challenge after the password; the code completes
  it. The rate limit covers code attempts as well.
- Turning it off needs the password and a code.
- Tricky: the clock. Allow one step either side.
- Tests: unit tests for the TOTP check with a fixed clock; route tests for setup, login with and
  without a code, recovery codes used once.

### 21. Email delivery and budget alerts

The app never sends anything; a budget at 120% is only visible to someone who opens the budgets
page.

- Optional SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`)
  through nodemailer. Without `SMTP_HOST` nothing is sent and the settings are hidden.
- Alerts per user, off by default: a budget passing the warning threshold (`WARNING_THRESHOLD`
  in `budgets/progress.ts`) or 100%, once per budget and month; and a monthly summary email on
  the 1st.
- Sent from a small outbox table by the existing timer, so a slow mail server never blocks a
  request and an alert is not sent twice.
- A mailpit service in `docker-compose.yml` behind a profile for development.
- Tests: route tests with a fake transport: an alert once per threshold, nothing without SMTP.

### 22. Password reset

There is no way back into an account after a forgotten password, and no admin who could help.
With email (item 21):

- `POST /api/auth/forgot` with an email, with the same answer whether the account exists or not;
  a single-use token stored hashed, valid for an hour; `POST /api/auth/reset` sets the new
  password and ends every session (item 1).
- The same rate limit as login.
- Without SMTP the link has nowhere to go: hide the link, and document a command
  (`npm run reset-password -w apps/api`) for whoever runs the server.
- Tests: route tests for unknown emails, expired and reused tokens, sessions ended.

### 23. Hardening the Docker setup

A few defaults that are fine on a laptop and not on a server:

- `docker-compose.yml` sets `JWT_SECRET` to `local-development-secret-change-me-0123456789` when
  none is given. A server started with the quick start accepts tokens anyone can sign. The API
  should refuse that value unless `SEED_DEMO` is on, and print why.
- The API port is published to the host (`4000:4000`) next to nginx. Requests that arrive there
  from the host come through the Docker bridge, which `trust proxy`
  (`'loopback, linklocal, uniquelocal'` in `app.ts`) trusts, so a client can choose its own IP
  with `X-Forwarded-For` and step around the login rate limit. Publish only the web port by
  default and trust only the nginx container.
- nginx (`apps/web/nginx.conf`) sends no security headers: a strict `Content-Security-Policy`,
  `X-Content-Type-Options`, `Referrer-Policy` and `frame-ancestors 'none'`.
- The login cookie is not `Secure` unless `COOKIE_SECURE=true`. Behind HTTPS it should be on by
  default; reading `X-Forwarded-Proto` from the trusted proxy can decide that.
- Tests: config tests for the secret check (`config.ts`); a route test that a forged
  `X-Forwarded-For` from an untrusted address does not change the rate limit key.

### 24. Backups and restore

The data lives in the `db-data` volume and nothing copies it. `docker compose down -v` in the
wrong folder ends years of history.

- A `backup` service in `docker-compose.yml` (behind a profile) that runs `pg_dump` every night
  into `./backups` and keeps the last 14.
- `docs/operations.md`: restoring a dump into a fresh volume, tried for real; upgrading (back up,
  pull, rebuild, the API migrates on start); a PostgreSQL major upgrade needs a dump and restore.
- Item 18 covers the per-user side; this one is for whoever runs the server.
- Tests: a script that restores a dump into a throwaway database and counts rows, run by hand.

### 25. Accessibility pass

The web app has about sixty `aria-` and `role` attributes, a reasonable start, but some parts are
hard to use without a mouse or a screen:

- the charts (`components/charts/`) have no text alternative; a table of the same numbers behind
  a "Show as table" toggle fixes that for everyone;
- budget status is told apart by the bar's colour (`tone` in `ProgressBar.tsx`), and
  `aria-valuenow` is clamped to 100, so a budget at 130% is announced as full, not as over;
- the modal (`Modal.tsx`) focuses its first field and gives focus back on close, but Tab can
  still leave it for the page behind;
- amounts read as bare numbers; income and expense should be said, not only coloured.

- Fix those, then add `axe-core` checks to the Testing Library tests for the main pages.
- Tests: the axe checks, plus keyboard tests for the modal and the month picker.

### 26. Tests for the pages

The API is tested route by route, but the web app has six test files for ten pages: helpers, the
progress bar, the transaction form, the month hook and the login page. The transactions list with
its filters and paging, the import dialog, budgets, recurring and goals have no tests, and those
are where the bugs in the changelog were (filters dropped on page change, transfers in an account
filter).

- Tests with Testing Library and a mocked `fetch` for: the transactions page (filters kept across
  pages, the account filter), the import dialog, the budgets page (copy from last month), the
  recurring form (frequencies), the goals page.
- A small helper in `apps/web/src/test` to render a page with the query client and a router.
- Tests: the item is the tests.

### 27. Faster with years of data

Every account balance is computed from scratch: `AccountsRepository.balances` sums all
transactions of each account on every call, and the net worth report does that for every month
of the range. Search uses `ILIKE` on payee and notes with `OFFSET` paging
(`TransactionsRepository.list`). With the demo year that is instant. With ten years and a few
accounts it is not.

- Measure first: a route test that seeds 50,000 transactions in PGlite and records the time of
  the list, the balances and net worth.
- A `pg_trgm` index on payee and notes for search (check PGlite supports the extension, or skip
  it there), and keyset paging on `(date, created_at, id)`.
- Balances: a monthly balance table maintained on write, or a materialised view refreshed after
  writes. Both make writes more complex; only do this if the measurement says so.
- Tests: the timing test, kept out of the default run if it is slow.
