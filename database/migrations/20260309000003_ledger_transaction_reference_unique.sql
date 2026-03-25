-- Add UNIQUE constraint to ledger_entries.transaction_reference
-- Prevents duplicate ledger entries from webhook retries or double-submit race conditions.
-- NULL values are excluded (NULLs are always unique in Postgres), so offline payments
-- that previously had NULL transaction_reference are unaffected.
-- New offline payments now generate a deterministic reference key for idempotency.

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_entries_transaction_reference_unique
  ON ledger_entries (transaction_reference)
  WHERE transaction_reference IS NOT NULL;
