-- Phase 4.3: Expiry and Storage Tracking for Leftover Ingredients
-- Adds storage_location, use_by_date, and expired flag to unused_ingredients.
-- Additive only — no existing columns are altered or dropped.

ALTER TABLE unused_ingredients
  ADD COLUMN IF NOT EXISTS storage_location TEXT,
  ADD COLUMN IF NOT EXISTS use_by_date DATE,
  ADD COLUMN IF NOT EXISTS expired BOOLEAN NOT NULL DEFAULT FALSE;

-- Index to quickly find non-expired, unallocated carry-forward items
CREATE INDEX IF NOT EXISTS idx_unused_ingredients_expiry
  ON unused_ingredients(tenant_id, expired, transferred_to_event_id)
  WHERE reason = 'leftover_reusable';

COMMENT ON COLUMN unused_ingredients.storage_location IS 'Where the ingredient is being stored (e.g., "Home fridge - top shelf", "Walk-in cooler")';
COMMENT ON COLUMN unused_ingredients.use_by_date IS 'Date by which this ingredient should be used. Null = unknown/not perishable.';
COMMENT ON COLUMN unused_ingredients.expired IS 'Set to true when the ingredient has passed its use_by_date or been discarded.';
