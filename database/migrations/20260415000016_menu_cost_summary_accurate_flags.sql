-- Fix menu_cost_summary.has_all_recipe_costs to check actual ingredient prices,
-- not just whether components have recipe_id linked.
-- Before: COUNT(*) = COUNT(c.recipe_id) - only checks recipe linkage
-- After: checks both recipe linkage AND ingredient-level price coverage
-- Also adds target_guest_count fallback for template menus (no event)

CREATE OR REPLACE VIEW menu_cost_summary AS
SELECT
  m.id AS menu_id,
  m.tenant_id,
  m.event_id,
  m.name AS menu_name,
  get_menu_total_component_count(m.id) AS total_component_count,
  compute_menu_cost_cents(m.id) AS total_recipe_cost_cents,
  CASE
    WHEN COALESCE(e.guest_count, m.target_guest_count, 0) > 0 THEN
      (compute_menu_cost_cents(m.id) / COALESCE(e.guest_count, m.target_guest_count))::INTEGER
    ELSE NULL
  END AS cost_per_guest_cents,
  CASE
    WHEN COALESCE(e.quoted_price_cents, 0) > 0 THEN
      (compute_menu_cost_cents(m.id)::DECIMAL / e.quoted_price_cents * 100)::DECIMAL(5,2)
    ELSE NULL
  END AS food_cost_percentage,
  -- has_all_recipe_costs: true only when ALL components have recipes
  -- AND all ingredients in those recipes have prices
  (
    SELECT
      COUNT(*) = COUNT(c.recipe_id)
      AND NOT EXISTS (
        SELECT 1
        FROM components c2
        JOIN dishes d2 ON d2.id = c2.dish_id
        JOIN recipe_ingredients ri ON ri.recipe_id = c2.recipe_id
        JOIN ingredients i ON i.id = ri.ingredient_id
        WHERE d2.menu_id = m.id
          AND c2.recipe_id IS NOT NULL
          AND COALESCE(i.cost_per_unit_cents, i.last_price_cents) IS NULL
      )
    FROM components c
    JOIN dishes d ON d.id = c.dish_id
    WHERE d.menu_id = m.id
  ) AS has_all_recipe_costs
FROM menus m
LEFT JOIN events e ON e.id = m.event_id;
