CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_key ON users (lower(email));
