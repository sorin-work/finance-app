-- One spending limit per expense category per month.
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  -- Always the first day of the month.
  month DATE NOT NULL CHECK (extract(day FROM month) = 1),
  amount BIGINT NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, month)
);

CREATE INDEX budgets_user_month_idx ON budgets (user_id, month);
