-- Canonical ingredients table: the master ingredient dictionary synced from OpenClaw Pi.
-- 48K+ ingredients covering every food item a chef could use.
-- Additive only: new table, no changes to existing schema.

CREATE TABLE IF NOT EXISTS openclaw.canonical_ingredients (
  ingredient_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  standard_unit TEXT,
  off_image_url TEXT,
  off_barcode TEXT,
  off_nutrition_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canonical_ingredients_category
  ON openclaw.canonical_ingredients(category);
CREATE INDEX IF NOT EXISTS idx_canonical_ingredients_name_fts
  ON openclaw.canonical_ingredients USING gin(to_tsvector('english', name));
