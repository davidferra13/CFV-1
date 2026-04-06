-- Recipe-level price confidence provenance
-- Aggregates per-ingredient last_price_confidence into recipe-level metrics.
-- This lets the UI distinguish between "all priced" (coverage) and "all trustworthy" (quality).

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
  (SELECT COUNT(*) FROM recipe_sub_recipes WHERE parent_recipe_id = r.id) AS sub_recipe_count,
  -- Provenance: aggregate confidence from ingredient-level data
  (
    SELECT ROUND(AVG(i.last_price_confidence)::NUMERIC, 2)
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = r.id
      AND i.last_price_confidence IS NOT NULL
  ) AS avg_price_confidence,
  (
    SELECT MIN(i.last_price_confidence)
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = r.id
      AND i.last_price_confidence IS NOT NULL
  ) AS min_price_confidence,
  (
    SELECT COUNT(*)
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = r.id
      AND i.last_price_confidence IS NOT NULL
      AND i.last_price_confidence < 0.5
  ) AS low_confidence_count
FROM recipes r
WHERE r.archived = false;
