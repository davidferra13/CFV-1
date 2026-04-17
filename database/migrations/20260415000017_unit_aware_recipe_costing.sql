-- Unit-aware recipe costing: prefer precomputed computed_cost_cents over naive multiplication.
-- The application-side refresh (lib/costing/refresh-recipe-costs.ts) uses the unit conversion
-- engine to populate computed_cost_cents correctly. This SQL function falls back to the naive
-- calculation only when computed_cost_cents is NULL (not yet refreshed).
--
-- Fixes Q1 from menu-costing-interrogation.md: recipe "2 lbs" with price "$0.50/oz"
-- now produces correct cost via the precomputed column instead of naive quantity * price.

CREATE OR REPLACE FUNCTION compute_recipe_cost_cents(p_recipe_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(
    CASE
      -- Prefer precomputed cost (unit-conversion-aware, set by application)
      WHEN ri.computed_cost_cents IS NOT NULL THEN
        ri.computed_cost_cents
      -- Fallback: naive multiplication (legacy, before refresh runs)
      WHEN COALESCE(i.cost_per_unit_cents, i.last_price_cents) IS NOT NULL THEN
        (ri.quantity * COALESCE(i.cost_per_unit_cents, i.last_price_cents))::INTEGER
      ELSE 0
    END
  ), 0)
  FROM recipe_ingredients ri
  JOIN ingredients i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = p_recipe_id;
$$ LANGUAGE SQL STABLE;

-- Also add a cost_computed_at timestamp to recipes for staleness detection
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS cost_computed_at TIMESTAMPTZ;

COMMENT ON COLUMN recipes.cost_computed_at IS
  'When computed_cost_cents was last refreshed by the unit-aware cost engine. NULL = never computed.';
