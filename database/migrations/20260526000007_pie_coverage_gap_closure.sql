-- PIE Coverage Gap Closure Phase 1: Manual Price Pinning columns on ingredients
-- Additive only. No DROP, DELETE, or TRUNCATE.

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS pinned_price_cents INTEGER
    CHECK (pinned_price_cents IS NULL OR pinned_price_cents > 0);

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS pinned_price_unit TEXT;

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS pinned_price_source TEXT;

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS pinned_price_vendor TEXT;

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS pinned_price_expires_at TIMESTAMPTZ;

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS pinned_price_set_at TIMESTAMPTZ;

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS pinned_price_set_by UUID;
