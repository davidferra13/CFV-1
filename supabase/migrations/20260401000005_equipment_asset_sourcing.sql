-- Equipment asset sourcing metadata
-- Additive only. No drops, deletes, or type rewrites.

ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS canonical_name TEXT,
  ADD COLUMN IF NOT EXISTS asset_state TEXT NOT NULL DEFAULT 'owned'
    CHECK (asset_state IN ('owned', 'wishlist', 'reference')),
  ADD COLUMN IF NOT EXISTS quantity_owned INTEGER NOT NULL DEFAULT 1
    CHECK (quantity_owned > 0),
  ADD COLUMN IF NOT EXISTS storage_location TEXT,
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS source_kind TEXT
    CHECK (
      source_kind IS NULL OR
      source_kind IN ('amazon', 'restaurant_supply', 'brand_direct', 'rental_house', 'local_store', 'other')
    ),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_sku TEXT,
  ADD COLUMN IF NOT EXISTS source_price_cents INTEGER
    CHECK (source_price_cents IS NULL OR source_price_cents >= 0),
  ADD COLUMN IF NOT EXISTS source_last_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_equipment_items_chef_asset_state
  ON equipment_items(chef_id, asset_state);

CREATE INDEX IF NOT EXISTS idx_equipment_items_chef_category_asset_state
  ON equipment_items(chef_id, category, asset_state);

COMMENT ON COLUMN equipment_items.canonical_name IS
  'Normalized product name used as the canonical asset identity across chef workflows.';
COMMENT ON COLUMN equipment_items.asset_state IS
  'owned = currently in the chef kit, wishlist = planned purchase, reference = canonical recommended item.';
COMMENT ON COLUMN equipment_items.source_url IS
  'Primary purchase link for the canonical source of truth for this asset.';
COMMENT ON COLUMN equipment_items.source_last_verified_at IS
  'When the source link or price was last manually verified.';
