-- Migration: Add version tracking to quotes
-- Enables creating revised quotes while preserving negotiation history.
-- Additive only — no existing columns changed.

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS version           INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_superseded     BOOLEAN NOT NULL DEFAULT FALSE;
-- Index for looking up version history
CREATE INDEX IF NOT EXISTS idx_quotes_previous_version_id
  ON quotes (previous_version_id)
  WHERE previous_version_id IS NOT NULL;
COMMENT ON COLUMN quotes.version IS
  'Version number for this quote. Starts at 1, increments when the chef creates a revision.';
COMMENT ON COLUMN quotes.previous_version_id IS
  'Points to the quote this version supersedes. NULL means first version or standalone.';
COMMENT ON COLUMN quotes.is_superseded IS
  'TRUE when a newer version of this quote has been created. Superseded quotes are read-only.';
