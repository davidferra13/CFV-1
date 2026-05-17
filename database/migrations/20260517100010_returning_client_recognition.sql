-- Returning Client Recognition
-- Adds columns to inquiries for storing auto-matched returning client data.
-- Additive only: no drops, no renames.

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS returning_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS returning_client_confidence TEXT;

-- Constrain confidence to known values
ALTER TABLE inquiries
  ADD CONSTRAINT inquiries_returning_client_confidence_check
  CHECK (returning_client_confidence IS NULL OR returning_client_confidence IN ('confirmed', 'likely', 'possible'));

-- Index for quick lookup of inquiries with returning client matches
CREATE INDEX IF NOT EXISTS idx_inquiries_returning_client
  ON inquiries (returning_client_id)
  WHERE returning_client_id IS NOT NULL;

COMMENT ON COLUMN inquiries.returning_client_id IS 'Auto-matched returning client from email, phone, or name+address signals';
COMMENT ON COLUMN inquiries.returning_client_confidence IS 'Match confidence: confirmed (email/phone), likely (name+address), possible (weak signal)';
