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
