-- Phase 4.3: Expiry and storage tracking on unused_ingredients
-- Adds storage_location, use_by_date, and expired flag so the chef can track
-- where leftovers are stored, when they expire, and mark them as no longer usable.
-- Additive only — no existing data affected.

ALTER TABLE unused_ingredients
  ADD COLUMN IF NOT EXISTS storage_location TEXT,
  ADD COLUMN IF NOT EXISTS use_by_date DATE,
  ADD COLUMN IF NOT EXISTS expired BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_unused_ingredients_expired
  ON unused_ingredients(tenant_id, expired)
  WHERE expired = FALSE;
