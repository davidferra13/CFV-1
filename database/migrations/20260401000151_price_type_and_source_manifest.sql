-- Price Type Separation + Source Manifest
-- Phase 1 of openclaw-total-capture spec.
-- All changes are additive (ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS).

-- Add price_type to store_products so wholesale and retail prices are never mixed.
-- Default 'retail' covers all existing rows.
ALTER TABLE openclaw.store_products
  ADD COLUMN IF NOT EXISTS price_type TEXT NOT NULL DEFAULT 'retail'
  CHECK (price_type IN ('retail', 'wholesale', 'commodity', 'farm_direct'));

-- Add store_type to stores so the query layer knows if a store is a wholesale
-- warehouse, a club, or a regular retail supermarket.
ALTER TABLE openclaw.stores
  ADD COLUMN IF NOT EXISTS store_type TEXT NOT NULL DEFAULT 'retail'
  CHECK (store_type IN ('retail', 'wholesale', 'club', 'online', 'farm', 'distributor'));

-- Index: filtering by price_type is a common pattern in the catalog browser
CREATE INDEX IF NOT EXISTS idx_oc_store_products_price_type
  ON openclaw.store_products(price_type);

-- Index: filtering by store_type for wholesale/retail separation
CREATE INDEX IF NOT EXISTS idx_oc_stores_store_type
  ON openclaw.stores(store_type);

-- Sources manifest: tracks what's been scanned and what hasn't.
-- One row per data source. Supports the scan-and-move protocol.
CREATE TABLE IF NOT EXISTS openclaw.source_manifest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('instacart', 'api', 'website', 'account', 'government', 'farm')),
  price_type TEXT NOT NULL DEFAULT 'retail' CHECK (price_type IN ('retail', 'wholesale', 'commodity', 'farm_direct')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'scanning', 'complete', 'failed', 'skipped')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  region TEXT,
  est_products INT,
  actual_products INT,
  scanned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_manifest_name
  ON openclaw.source_manifest(source_name);

-- USDA FoodData Central product catalog (pre-create for Phase 3)
CREATE TABLE IF NOT EXISTS openclaw.usda_fdc_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fdc_id INT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  brand_owner TEXT,
  brand_name TEXT,
  gtin_upc TEXT,
  ingredients_text TEXT,
  serving_size NUMERIC,
  serving_size_unit TEXT,
  household_serving_text TEXT,
  food_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usda_fdc_upc
  ON openclaw.usda_fdc_products(gtin_upc) WHERE gtin_upc IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usda_fdc_fts
  ON openclaw.usda_fdc_products USING GIN(to_tsvector('english', description));
