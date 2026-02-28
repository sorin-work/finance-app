-- Templates that generate transactions on a schedule (rent, salary, subscriptions).
CREATE TABLE recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  transfer_account_id UUID REFERENCES accounts (id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories (id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  payee TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL
    CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  -- The next date a transaction will be generated for.
  next_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((type = 'transfer') = (transfer_account_id IS NOT NULL)),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX recurring_transactions_user_id_idx ON recurring_transactions (user_id);
CREATE INDEX recurring_transactions_due_idx ON recurring_transactions (next_date) WHERE active;

ALTER TABLE transactions
  ADD COLUMN recurring_id UUID REFERENCES recurring_transactions (id) ON DELETE SET NULL;
