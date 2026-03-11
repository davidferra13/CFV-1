-- Client self-service controls
-- Adds soft-delete request fields to clients for portal self-service privacy controls.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS account_deletion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_deletion_scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_deletion_cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
COMMENT ON COLUMN clients.account_deletion_requested_at IS
  'When the client requested account deletion from the client portal.';
COMMENT ON COLUMN clients.account_deletion_scheduled_for IS
  'When the client account should be purged after the 30-day grace period.';
COMMENT ON COLUMN clients.account_deletion_cancelled_at IS
  'When a pending client account deletion request was cancelled.';
COMMENT ON COLUMN clients.deletion_reason IS
  'Optional reason supplied by the client when requesting account deletion.';
CREATE INDEX IF NOT EXISTS idx_clients_account_deletion_scheduled_for
  ON clients(account_deletion_scheduled_for)
  WHERE account_deletion_requested_at IS NOT NULL;
