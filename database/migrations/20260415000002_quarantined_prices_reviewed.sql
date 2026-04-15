-- Add missing reviewed column to openclaw.quarantined_prices
-- The sync script queries WHERE NOT reviewed but the column was never added.

ALTER TABLE openclaw.quarantined_prices
  ADD COLUMN IF NOT EXISTS reviewed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_qp_reviewed
  ON openclaw.quarantined_prices (reviewed)
  WHERE NOT reviewed;
