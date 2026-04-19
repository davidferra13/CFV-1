-- Migration: Add store_state to ingredient_price_history for geographic price resolution
-- Additive only: new column + rebuilt materialized view with state grouping

-- 1. Add store_state column (nullable, no existing data needs backfill)
ALTER TABLE ingredient_price_history
  ADD COLUMN IF NOT EXISTS store_state TEXT;

-- 2. Index for state-filtered queries on the materialized view
CREATE INDEX IF NOT EXISTS idx_iph_store_state
  ON ingredient_price_history (store_state)
  WHERE store_state IS NOT NULL;

-- 3. Rebuild regional_price_averages with state grouping
-- DROP + CREATE (not ALTER) because materialized views can't be modified in place
DROP MATERIALIZED VIEW IF EXISTS regional_price_averages;

CREATE MATERIALIZED VIEW regional_price_averages AS
SELECT
  iph.ingredient_id,
  i.name AS ingredient_name,
  i.category,
  iph.store_state,
  COUNT(DISTINCT iph.store_name) AS store_count,
  ROUND(AVG(iph.price_per_unit_cents)) AS avg_price_per_unit_cents,
  MIN(iph.price_per_unit_cents) AS min_price_per_unit_cents,
  MAX(iph.price_per_unit_cents) AS max_price_per_unit_cents,
  MODE() WITHIN GROUP (ORDER BY iph.unit) AS most_common_unit,
  MAX(iph.purchase_date) AS most_recent_date
FROM ingredient_price_history iph
JOIN ingredients i ON i.id = iph.ingredient_id
WHERE iph.source LIKE 'openclaw_%'
  AND iph.purchase_date > CURRENT_DATE - INTERVAL '60 days'
  AND iph.price_per_unit_cents > 0
  AND iph.price_per_unit_cents < 50000
GROUP BY iph.ingredient_id, i.name, i.category, iph.store_state
HAVING COUNT(DISTINCT iph.store_name) >= 2;

-- Unique index required for CONCURRENTLY refresh
-- Composite: ingredient + state (state can be null for legacy rows)
CREATE UNIQUE INDEX idx_rpa_ingredient_state
  ON regional_price_averages (ingredient_id, COALESCE(store_state, '__national__'));
