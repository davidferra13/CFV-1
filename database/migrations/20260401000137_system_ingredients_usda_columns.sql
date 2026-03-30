-- Migration: Add USDA SR Legacy columns to system_ingredients
-- Part of Nationwide Ingredient Catalog (Phase A - Dictionary Expansion)
-- All changes are additive: new columns, new indexes. No DROP, DELETE, or TRUNCATE.

-- USDA identifiers for linking to FoodData Central
ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS usda_fdc_id INTEGER,
  ADD COLUMN IF NOT EXISTS usda_ndb_number INTEGER,
  ADD COLUMN IF NOT EXISTS usda_food_group TEXT;

-- Search and deduplication support
ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';

-- Unique constraints for idempotent imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_ingredients_slug
  ON system_ingredients(slug) WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_ingredients_fdc_id
  ON system_ingredients(usda_fdc_id) WHERE usda_fdc_id IS NOT NULL;

-- GIN index on aliases for array search
CREATE INDEX IF NOT EXISTS idx_system_ingredients_aliases
  ON system_ingredients USING GIN(aliases);
