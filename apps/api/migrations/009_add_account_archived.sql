-- Archived accounts keep their history but are hidden from day-to-day use.
ALTER TABLE accounts ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;
