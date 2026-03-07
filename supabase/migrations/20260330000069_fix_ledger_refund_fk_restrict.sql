-- Fix: ledger_entries.refunded_entry_id has no ON DELETE clause.
-- The ledger is append-only and immutable. A refund entry must always
-- reference the original payment. Using RESTRICT enforces this at the
-- database level: you cannot delete an entry that has a refund pointing to it.

ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_refunded_entry_id_fkey;
ALTER TABLE ledger_entries
  ADD CONSTRAINT ledger_entries_refunded_entry_id_fkey
  FOREIGN KEY (refunded_entry_id) REFERENCES ledger_entries(id) ON DELETE RESTRICT;
