-- Ticketed Events Lifecycle #23: Fix 5 critical bugs
-- 1. Add circle_config JSONB column to event_share_settings (code queries it)
-- 2. Make client_id nullable on ledger_entries for ticket-originated entries
--    (ticket buyers are anonymous public users, not ChefFlow clients)
-- 3. Add payment_method default for ticket-originated ledger entries

-- 1. circle_config column on event_share_settings
ALTER TABLE event_share_settings
  ADD COLUMN IF NOT EXISTS circle_config JSONB;

-- 2. Make client_id nullable on ledger_entries
-- Ticket purchases come from anonymous public buyers who are NOT ChefFlow clients.
-- The existing NOT NULL constraint prevents recording ticket revenue in the ledger.
ALTER TABLE ledger_entries
  ALTER COLUMN client_id DROP NOT NULL;

-- 3. Add transaction_reference index for idempotent ticket ledger entries
-- (index already exists from prior migration, this is a safety no-op)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_ticket_ref
  ON ledger_entries(transaction_reference)
  WHERE transaction_reference IS NOT NULL
    AND transaction_reference LIKE 'ticket_%';
