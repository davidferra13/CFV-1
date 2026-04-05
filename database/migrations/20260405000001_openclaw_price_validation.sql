-- OpenClaw Price Data Validation Gate
-- Adds quarantine table for rejected prices and audit log for sync runs.
-- Both tables live in the openclaw schema alongside existing sync infrastructure.

-- Quarantine: prices rejected by the validation gate before they reach
-- ingredient_price_history. Reviewable by admins.
CREATE TABLE IF NOT EXISTS openclaw.quarantined_prices (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  ingredient_name TEXT,
  price_cents INTEGER,
  old_price_cents INTEGER,
  rejection_reason TEXT NOT NULL,
  raw_data JSONB,
  quarantined_at TIMESTAMPTZ DEFAULT now(),
  reviewed BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  reviewed_action TEXT -- 'approved', 'rejected', 'corrected'
);

CREATE INDEX IF NOT EXISTS idx_quarantined_prices_reviewed
  ON openclaw.quarantined_prices(reviewed)
  WHERE NOT reviewed;

-- Audit log: one row per sync execution (price_sync, catalog_pull,
-- normalization). Tracks acceptance/rejection counts per run.
CREATE TABLE IF NOT EXISTS openclaw.sync_audit_log (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'price_sync', 'catalog_pull', 'normalization'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  records_accepted INTEGER DEFAULT 0,
  records_quarantined INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);
