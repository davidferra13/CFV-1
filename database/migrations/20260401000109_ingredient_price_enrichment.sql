-- 20260401000109_ingredient_price_enrichment.sql
-- Adds source tracking and trend data to ingredients table
-- for the unified price resolution system (OpenClaw V2).

-- Source tracking: where did the current price come from?
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS last_price_source TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS last_price_store TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS last_price_confidence NUMERIC(3,2);

-- Trend data: is the price going up or down?
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_trend_direction TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_trend_pct NUMERIC(5,2);

-- Index for price freshness queries
CREATE INDEX IF NOT EXISTS idx_ingredients_price_date
  ON ingredients(last_price_date)
  WHERE last_price_date IS NOT NULL;

-- Index for resolution chain queries (exact source match, indexed)
CREATE INDEX IF NOT EXISTS idx_iph_source_lookup
  ON ingredient_price_history(ingredient_id, tenant_id, source, purchase_date DESC)
  WHERE source IS NOT NULL;

-- Unique constraint for OpenClaw sync dedup (prevents duplicate rows on concurrent syncs)
-- Uses ON CONFLICT DO UPDATE in the sync upsert query
CREATE UNIQUE INDEX IF NOT EXISTS idx_iph_openclaw_dedup
  ON ingredient_price_history(ingredient_id, tenant_id, source, purchase_date)
  WHERE source LIKE 'openclaw_%';

-- Backfill: mark existing prices as legacy (no source attribution)
UPDATE ingredients
  SET last_price_source = 'openclaw_legacy'
  WHERE last_price_cents IS NOT NULL
    AND last_price_source IS NULL;
