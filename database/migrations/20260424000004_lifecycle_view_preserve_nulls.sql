-- Fix: Preserve NULL vs 0 distinction in lifecycle view
-- NULL = no purchase/usage transactions recorded (not yet tracked)
-- 0 = explicitly recorded zero quantity
-- The prior view used COALESCE(..., 0) which collapsed both cases.

CREATE OR REPLACE VIEW event_ingredient_lifecycle AS
WITH recipe_need AS (
  SELECT
    e.id AS event_id,
    e.tenant_id AS chef_id,
    i.id AS ingredient_id,
    i.name AS ingredient_name,
    ri.unit,
    SUM(ri.quantity * COALESCE(c.scale_factor, 1)) AS recipe_qty,
    COALESCE(ri.yield_pct, i.default_yield_pct, 100) AS yield_pct,
    SUM(
      ri.quantity * COALESCE(c.scale_factor, 1) * 100.0
      / GREATEST(COALESCE(ri.yield_pct, i.default_yield_pct, 100), 1)
    ) AS buy_qty,
    i.last_price_cents
  FROM events e
  JOIN menus m ON m.event_id = e.id
  JOIN dishes d ON d.menu_id = m.id
  JOIN components c ON c.dish_id = d.id AND c.recipe_id IS NOT NULL
  JOIN recipe_ingredients ri ON ri.recipe_id = c.recipe_id
  JOIN ingredients i ON i.id = ri.ingredient_id
  GROUP BY e.id, e.tenant_id, i.id, i.name, ri.unit, i.last_price_cents,
           COALESCE(ri.yield_pct, i.default_yield_pct, 100)
),
purchased AS (
  SELECT
    it.event_id,
    it.ingredient_id,
    it.unit,
    SUM(ABS(it.quantity)) AS purchased_qty,
    SUM(ABS(COALESCE(it.cost_cents, 0))) AS purchased_cost_cents
  FROM inventory_transactions it
  WHERE it.transaction_type = 'receive'
    AND it.event_id IS NOT NULL
  GROUP BY it.event_id, it.ingredient_id, it.unit
),
used AS (
  SELECT
    it.event_id,
    it.ingredient_id,
    it.unit,
    SUM(ABS(it.quantity)) AS used_qty
  FROM inventory_transactions it
  WHERE it.transaction_type = 'event_deduction'
    AND it.event_id IS NOT NULL
  GROUP BY it.event_id, it.ingredient_id, it.unit
)
SELECT
  rn.event_id,
  rn.chef_id,
  rn.ingredient_id,
  rn.ingredient_name,
  rn.unit,
  -- Stage 1: What recipe says (raw)
  ROUND(rn.recipe_qty, 3) AS recipe_qty,
  -- Stage 2: What you need to buy (yield-adjusted)
  rn.yield_pct,
  ROUND(rn.buy_qty, 3) AS buy_qty,
  -- Stage 3: What was actually purchased (NULL = not recorded, 0 = confirmed zero)
  p.purchased_qty,
  p.purchased_cost_cents,
  -- Stage 4: What was actually used (NULL = not recorded, 0 = confirmed zero)
  u.used_qty,
  -- Stage 5: What's left (NULL if either upstream stage is unrecorded)
  CASE
    WHEN p.purchased_qty IS NOT NULL AND u.used_qty IS NOT NULL
    THEN p.purchased_qty - u.used_qty
    ELSE NULL
  END AS computed_leftover_qty,
  -- Price reference
  rn.last_price_cents,
  -- Variance: bought vs what was needed (NULL if not yet purchased)
  CASE
    WHEN p.purchased_qty IS NOT NULL
    THEN p.purchased_qty - ROUND(rn.buy_qty, 3)
    ELSE NULL
  END AS purchase_variance_qty,
  -- Variance: used vs recipe spec (NULL if not yet tracked)
  CASE
    WHEN u.used_qty IS NOT NULL
    THEN u.used_qty - ROUND(rn.recipe_qty, 3)
    ELSE NULL
  END AS usage_variance_qty
FROM recipe_need rn
LEFT JOIN purchased p
  ON rn.event_id = p.event_id AND rn.ingredient_id = p.ingredient_id
LEFT JOIN used u
  ON rn.event_id = u.event_id AND rn.ingredient_id = u.ingredient_id;
