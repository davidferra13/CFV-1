-- =====================================================================================
-- SYSTEM INGREDIENTS: Pre-built ingredient database with conversions
-- Inspired by Meez's 2,500+ ingredient database
-- =====================================================================================
-- This table provides a shared reference database of common cooking ingredients.
-- Chefs can browse/search and import into their personal ingredient list.
-- Data is read-only for all users (seeded by migration, managed by admins).

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE TABLE IF NOT EXISTS system_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category ingredient_category NOT NULL,
  subcategory TEXT NOT NULL DEFAULT '',

  -- Unit info
  unit_type TEXT NOT NULL DEFAULT 'weight'
    CHECK (unit_type IN ('weight', 'volume', 'each', 'bunch')),
  standard_unit TEXT NOT NULL DEFAULT 'g'
    CHECK (standard_unit IN ('g', 'oz', 'ml', 'fl_oz', 'each', 'bunch')),

  -- Average market price (cents per standard unit)
  cost_per_unit_cents INTEGER DEFAULT 0,

  -- Weight-to-volume conversions
  weight_to_volume_ratio NUMERIC(8,4) DEFAULT NULL,   -- grams per ml (density)
  cup_weight_grams NUMERIC(8,2) DEFAULT NULL,          -- weight of 1 US cup
  tbsp_weight_grams NUMERIC(8,2) DEFAULT NULL,         -- weight of 1 US tbsp

  -- Allergen tags (big 9)
  allergen_tags TEXT[] NOT NULL DEFAULT '{}',

  -- Prep actions with yield percentages
  common_prep_actions JSONB NOT NULL DEFAULT '[]',

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_system_ingredients_name
  ON system_ingredients USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_system_ingredients_category
  ON system_ingredients (category);
CREATE INDEX IF NOT EXISTS idx_system_ingredients_active
  ON system_ingredients (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_system_ingredients_name_trgm
  ON system_ingredients USING gin (name extensions.gin_trgm_ops);
-- RLS: everyone can read system ingredients, nobody can write (admin via service role)
ALTER TABLE system_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_ingredients_read_all"
  ON system_ingredients FOR SELECT
  USING (true);
-- Grant read access
GRANT SELECT ON system_ingredients TO authenticated;
GRANT SELECT ON system_ingredients TO anon;
