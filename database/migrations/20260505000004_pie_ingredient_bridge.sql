-- PIE Ingredient Bridge
-- Connects system_ingredients (UUID, app-level) to canonical_ingredients (slug, openclaw)
-- This lets resolved_prices (keyed by system_ingredient_id) connect to the census (keyed by slug)
-- Also enables the resolve-prices-worker to produce slug-keyed prices that directly match census.

-- Materialized view for fast lookups. Refresh after bulk ingredient imports.
CREATE MATERIALIZED VIEW IF NOT EXISTS openclaw.ingredient_bridge AS
SELECT DISTINCT ON (si.id)
  si.id AS system_ingredient_id,
  ci.ingredient_id AS canonical_ingredient_id,
  si.name AS system_name,
  ci.name AS canonical_name,
  ci.category
FROM public.system_ingredients si
JOIN openclaw.canonical_ingredients ci
  ON lower(si.name) = lower(ci.name)
ORDER BY si.id, ci.ingredient_id
WITH DATA;

-- Indexes for fast joins from both directions
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredient_bridge_system
  ON openclaw.ingredient_bridge(system_ingredient_id);

CREATE INDEX IF NOT EXISTS idx_ingredient_bridge_canonical
  ON openclaw.ingredient_bridge(canonical_ingredient_id);

-- Comment
COMMENT ON MATERIALIZED VIEW openclaw.ingredient_bridge IS
  'Maps system_ingredients UUIDs to canonical_ingredients slugs. 22K+ rows. Enables census coverage measurement against resolved_prices. REFRESH MATERIALIZED VIEW openclaw.ingredient_bridge after bulk imports.';
