-- Migration: Fix silent zero bugs in pricing functions and views
-- G1: compute_recipe_cost_cents returns 0 for unpriced ingredients instead of NULL
-- G4: event_inventory_variance uses COALESCE(last_price_cents, 0) masking unpriced variance

-- ============================================
-- G1: compute_recipe_cost_cents - return NULL when ingredients have no pricing
-- Previously: ELSE 0 in CASE + COALESCE(SUM(...), 0) outer wrapper
-- Now: ELSE NULL in CASE + bare SUM (returns NULL when no pricing exists)
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
  SELECT SUM(
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
      ELSE NULL
    END
  )::INTEGER
  FROM all_recipe_costs arc
  JOIN recipe_ingredients ri ON ri.recipe_id = arc.recipe_id
  JOIN ingredients i ON i.id = ri.ingredient_id;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- G4: event_inventory_variance - remove COALESCE(last_price_cents, 0)
-- Let NULL propagate so unpriced ingredient variance shows as NULL, not $0
-- ============================================

CREATE OR REPLACE VIEW event_inventory_variance AS
WITH expected_usage AS (
  SELECT
    e.id AS event_id,
    e.tenant_id AS chef_id,
    i.id AS ingredient_id,
    i.name AS ingredient_name,
    ri.unit,
    SUM(ri.quantity * COALESCE(c.scale_factor, 1)) AS expected_qty,
    i.last_price_cents
  FROM events e
  JOIN menus m ON m.event_id = e.id
  JOIN dishes d ON d.menu_id = m.id
  JOIN components c ON c.dish_id = d.id AND c.recipe_id IS NOT NULL
  JOIN recipe_ingredients ri ON ri.recipe_id = c.recipe_id
  JOIN ingredients i ON i.id = ri.ingredient_id
  WHERE e.status IN ('completed', 'in_progress')
  GROUP BY e.id, e.tenant_id, i.id, i.name, ri.unit, i.last_price_cents
),
actual_usage AS (
  SELECT
    it.event_id,
    it.chef_id,
    it.ingredient_id,
    MAX(it.ingredient_name) AS ingredient_name,
    it.unit,
    ABS(SUM(it.quantity)) AS actual_qty
  FROM inventory_transactions it
  WHERE it.event_id IS NOT NULL
    AND it.transaction_type = 'event_deduction'
  GROUP BY it.event_id, it.chef_id, it.ingredient_id, it.unit
)
SELECT
  eu.event_id,
  eu.chef_id,
  eu.ingredient_id,
  eu.ingredient_name,
  eu.unit,
  eu.expected_qty,
  COALESCE(au.actual_qty, 0) AS actual_qty,
  COALESCE(au.actual_qty, 0) - eu.expected_qty AS variance_qty,
  eu.last_price_cents,
  -- G4 fix: NULL propagates when price unknown (was COALESCE(last_price_cents, 0))
  ((COALESCE(au.actual_qty, 0) - eu.expected_qty) * eu.last_price_cents)::INTEGER AS variance_cost_cents
FROM expected_usage eu
LEFT JOIN actual_usage au
  ON eu.event_id = au.event_id
  AND eu.ingredient_id = au.ingredient_id;
