-- Budgets and the monthly summary sum expenses per category for one user and
-- date range; this keeps those queries off a full scan of the user's history.
CREATE INDEX transactions_expense_category_idx
  ON transactions (user_id, category_id, date)
  WHERE type = 'expense';

-- Looking up what a recurring rule generated.
CREATE INDEX transactions_recurring_id_idx
  ON transactions (recurring_id)
  WHERE recurring_id IS NOT NULL;
