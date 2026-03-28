-- Apply component scale_factor to menu cost calculation.
-- Previously ignored scale_factor, causing menus with scaled components
-- to show incorrect costs.

CREATE OR REPLACE FUNCTION compute_menu_cost_cents(p_menu_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(
    (compute_recipe_cost_cents(c.recipe_id) * c.scale_factor)::INTEGER
  ), 0)
  FROM components c
  JOIN dishes d ON d.id = c.dish_id
  WHERE d.menu_id = p_menu_id AND c.recipe_id IS NOT NULL;
$$ LANGUAGE SQL STABLE;
