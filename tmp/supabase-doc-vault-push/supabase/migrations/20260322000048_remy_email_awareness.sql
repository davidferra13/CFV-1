-- Remy Email Awareness
-- Adds body content columns to gmail_sync_log so Remy can read and search
-- email content. Previously only metadata (subject, from, classification)
-- was stored — email bodies were only in the messages table for classified
-- emails. This makes ALL synced emails queryable by Remy.

-- 1. Add content columns to gmail_sync_log
ALTER TABLE gmail_sync_log
  ADD COLUMN IF NOT EXISTS body_preview text,
  ADD COLUMN IF NOT EXISTS snippet text,
  ADD COLUMN IF NOT EXISTS to_address text,
  ADD COLUMN IF NOT EXISTS received_at timestamptz;
-- 2. Index for efficient "recent emails" queries by Remy
CREATE INDEX IF NOT EXISTS idx_gmail_sync_log_received
  ON gmail_sync_log (tenant_id, received_at DESC)
  WHERE action_taken != 'error';
-- 3. Index for email search (subject + from)
CREATE INDEX IF NOT EXISTS idx_gmail_sync_log_search
  ON gmail_sync_log (tenant_id)
  WHERE body_preview IS NOT NULL;
COMMENT ON COLUMN gmail_sync_log.body_preview IS 'First 2000 chars of email body for Remy search/context';
COMMENT ON COLUMN gmail_sync_log.snippet IS 'First 200 chars of email body for list display';
COMMENT ON COLUMN gmail_sync_log.to_address IS 'Recipient email address';
COMMENT ON COLUMN gmail_sync_log.received_at IS 'When the email was received (from Gmail internalDate)';
