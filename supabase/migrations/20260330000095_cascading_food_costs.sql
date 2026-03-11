-- Cascading Food Costs: Yield-aware costing, per-ingredient cost tracking,
-- and cascading cost propagation through sub-recipes and menus.
--
-- Additive only. Extends existing tables with new columns.
-- Depends on: Layer 4 (recipes, ingredients, recipe_ingredients),
--             20260324000007_sub_recipes (recipe_sub_recipes)

-- ============================================
-- 1. INGREDIENTS: Add costing + yield columns
-- ============================================

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS cost_per_unit_cents INTEGER,
  ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'weight'
    CHECK (unit_type IS NULL OR unit_type IN ('weight', 'volume', 'each', 'length')),
  ADD COLUMN IF NOT EXISTS weight_to_volume_ratio DECIMAL(8,4),
  ADD COLUMN IF NOT EXISTS default_yield_pct INTEGER DEFAULT 100
    CHECK (default_yield_pct IS NULL OR (default_yield_pct > 0 AND default_yield_pct <= 100));
COMMENT ON COLUMN ingredients.cost_per_unit_cents IS 'Canonical cost per default_unit in cents. Updated from price history or manual entry.';
COMMENT ON COLUMN ingredients.unit_type IS 'Classification of the default_unit: weight, volume, each, or length.';
COMMENT ON COLUMN ingredients.weight_to_volume_ratio IS 'Grams per mL for unit conversion (e.g. flour = 0.593, water = 1.0).';
COMMENT ON COLUMN ingredients.default_yield_pct IS 'Default usable yield after standard prep (100 = no loss, 85 = 15% trim loss).';
-- ============================================
-- 2. RECIPE_INGREDIENTS: Add prep + yield columns
-- ============================================

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS prep_action TEXT,
  ADD COLUMN IF NOT EXISTS yield_pct INTEGER DEFAULT 100
    CHECK (yield_pct IS NULL OR (yield_pct > 0 AND yield_pct <= 100)),
  ADD COLUMN IF NOT EXISTS computed_cost_cents INTEGER;
COMMENT ON COLUMN recipe_ingredients.prep_action IS 'Prep method applied (e.g. peel, dice, fillet). Drives yield calculation.';
COMMENT ON COLUMN recipe_ingredients.yield_pct IS 'Usable yield after this prep action (100 = no loss). Overrides ingredient default when set.';
COMMENT ON COLUMN recipe_ingredients.computed_cost_cents IS 'Computed: (cost_per_unit * quantity) / (yield_pct / 100). Updated by cascade engine.';
-- ============================================
-- 3. RECIPES: Add computed cost columns
-- ============================================

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS total_cost_cents INTEGER,
  ADD COLUMN IF NOT EXISTS cost_per_serving_cents INTEGER;
COMMENT ON COLUMN recipes.total_cost_cents IS 'Computed sum of all ingredient + sub-recipe costs (yield-adjusted). Updated by cascade engine.';
COMMENT ON COLUMN recipes.cost_per_serving_cents IS 'total_cost_cents / yield_quantity. Updated by cascade engine.';
-- ============================================
-- 4. EVENTS: Add cost refresh flag
-- ============================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS cost_needs_refresh BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cost_refreshed_at TIMESTAMPTZ;
COMMENT ON COLUMN events.cost_needs_refresh IS 'Set true when upstream ingredient/recipe costs change. Chef reviews before clearing.';
-- ============================================
-- 5. UPDATE compute_recipe_cost_cents to be yield-aware
-- ============================================

CREATE OR REPLACE FUNCTION compute_recipe_cost_cents(p_recipe_id UUID)
RETURNS INTEGER AS $$
  WITH RECURSIVE all_recipe_costs AS (
    -- Base: the recipe itself, multiplier = 1
    SELECT
      p_recipe_id AS recipe_id,
      1.0::DECIMAL AS multiplier

    UNION ALL

    -- Sub-recipes: multiply by the sub-recipe's quantity
    SELECT
      rsr.child_recipe_id,
      arc.multiplier * rsr.quantity
    FROM recipe_sub_recipes rsr
    JOIN all_recipe_costs arc ON arc.recipe_id = rsr.parent_recipe_id
  )
  SELECT COALESCE(SUM(
    CASE
      WHEN COALESCE(i.cost_per_unit_cents, i.last_price_cents) IS NOT NULL THEN
        -- Cost = (unit_cost * quantity * multiplier) / (yield_pct / 100)
        (
          COALESCE(i.cost_per_unit_cents, i.last_price_cents)
          * ri.quantity
          * arc.multiplier
          * 100.0
          / COALESCE(NULLIF(ri.yield_pct, 0), NULLIF(i.default_yield_pct, 0), 100)
        )::INTEGER
      ELSE 0
    END
  ), 0)
  FROM all_recipe_costs arc
  JOIN recipe_ingredients ri ON ri.recipe_id = arc.recipe_id
  JOIN ingredients i ON i.id = ri.ingredient_id;
$$ LANGUAGE SQL STABLE;
-- ============================================
-- 6. Helper: Recompute and store recipe costs
-- Called by the cascade engine after price changes.
-- ============================================

CREATE OR REPLACE FUNCTION recompute_and_store_recipe_cost(p_recipe_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total INTEGER;
  v_yield DECIMAL;
  v_per_serving INTEGER;
BEGIN
  v_total := compute_recipe_cost_cents(p_recipe_id);

  SELECT yield_quantity INTO v_yield FROM recipes WHERE id = p_recipe_id;

  IF v_yield IS NOT NULL AND v_yield > 0 THEN
    v_per_serving := (v_total / v_yield)::INTEGER;
  ELSE
    v_per_serving := NULL;
  END IF;

  UPDATE recipes
  SET
    total_cost_cents = v_total,
    cost_per_serving_cents = v_per_serving
  WHERE id = p_recipe_id;
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- 7. Helper: Recompute recipe_ingredients.computed_cost_cents
-- ============================================

CREATE OR REPLACE FUNCTION recompute_recipe_ingredient_costs(p_recipe_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE recipe_ingredients ri
  SET computed_cost_cents = (
    CASE
      WHEN COALESCE(i.cost_per_unit_cents, i.last_price_cents) IS NOT NULL THEN
        (
          COALESCE(i.cost_per_unit_cents, i.last_price_cents)
          * ri.quantity
          * 100.0
          / COALESCE(NULLIF(ri.yield_pct, 0), NULLIF(i.default_yield_pct, 0), 100)
        )::INTEGER
      ELSE NULL
    END
  )
  FROM ingredients i
  WHERE i.id = ri.ingredient_id
    AND ri.recipe_id = p_recipe_id;
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- 8. Update recipe_cost_summary view to include new columns
-- ============================================

CREATE OR REPLACE VIEW recipe_cost_summary AS
SELECT
  r.id AS recipe_id,
  r.tenant_id,
  r.name AS recipe_name,
  r.category,
  COALESCE(r.total_cost_cents, compute_recipe_cost_cents(r.id)) AS total_ingredient_cost_cents,
  COALESCE(
    r.cost_per_serving_cents,
    CASE
      WHEN r.yield_quantity > 0 THEN
        (compute_recipe_cost_cents(r.id) / r.yield_quantity)::INTEGER
      ELSE NULL
    END
  ) AS cost_per_portion_cents,
  (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id) AS ingredient_count,
  (
    SELECT COUNT(*) = COUNT(COALESCE(i.cost_per_unit_cents, i.last_price_cents))
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = r.id
  ) AS has_all_prices,
  (
    SELECT MAX(i.last_price_date)
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = r.id
  ) AS last_price_updated_at,
  (SELECT COUNT(*) FROM recipe_sub_recipes WHERE parent_recipe_id = r.id) AS sub_recipe_count
FROM recipes r
WHERE r.archived = false;
