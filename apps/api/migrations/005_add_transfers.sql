-- A transfer moves money from account_id to transfer_account_id in a single row.
ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'transfer'));

ALTER TABLE transactions
  ADD COLUMN transfer_account_id UUID REFERENCES accounts (id) ON DELETE CASCADE;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_transfer_account_check
  CHECK ((type = 'transfer') = (transfer_account_id IS NOT NULL));

CREATE INDEX transactions_transfer_account_id_idx
  ON transactions (transfer_account_id)
  WHERE transfer_account_id IS NOT NULL;
