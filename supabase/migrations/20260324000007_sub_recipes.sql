-- Migration: Sub-recipes — recipes that reference other recipes
-- Additive only: new table + triggers + updated functions
--
-- Enables recipe nesting: Beef Wellington → Duxelles, Puff Pastry, Madeira Sauce
-- Madeira Sauce → Beef Stock (which is itself a recipe)
--
-- quantity/unit: how much of the child recipe is used. Default "1 batch" = simple multiplier.
-- Circular reference prevention via trigger (recursive CTE walk).

-- =====================================================================================
-- TABLE: recipe_sub_recipes
-- =====================================================================================

CREATE TABLE recipe_sub_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Relationships
  parent_recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  child_recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,

  -- How much of the child recipe is used in the parent
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1.0,
  unit TEXT NOT NULL DEFAULT 'batch',

  -- Ordering within the parent recipe
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Optional notes (e.g. "use half batch", "only the liquid")
  notes TEXT,

  -- Constraints
  CHECK (quantity > 0),
  CHECK (parent_recipe_id != child_recipe_id),
  UNIQUE (parent_recipe_id, child_recipe_id)
);

-- Indexes
CREATE INDEX idx_recipe_sub_recipes_parent ON recipe_sub_recipes(parent_recipe_id);
CREATE INDEX idx_recipe_sub_recipes_child ON recipe_sub_recipes(child_recipe_id);

-- Updated_at trigger (reuse existing Layer 4 function)
CREATE TRIGGER update_recipe_sub_recipes_updated_at
  BEFORE UPDATE ON recipe_sub_recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_layer4_updated_at();

-- =====================================================================================
-- RLS: recipe_sub_recipes
-- Follows same pattern as recipe_ingredients (inherit from parent recipe)
-- =====================================================================================

ALTER TABLE recipe_sub_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select_recipe_sub_recipes ON recipe_sub_recipes
  FOR SELECT
  USING (
    parent_recipe_id IN (
      SELECT id FROM recipes WHERE tenant_id = (
        SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
      )
    )
    OR child_recipe_id IN (
      SELECT id FROM recipes WHERE tenant_id = (
        SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
      )
    )
  );

CREATE POLICY tenant_isolation_insert_recipe_sub_recipes ON recipe_sub_recipes
  FOR INSERT
  WITH CHECK (
    parent_recipe_id IN (
      SELECT id FROM recipes WHERE tenant_id = (
        SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
      )
    )
  );

CREATE POLICY tenant_isolation_update_recipe_sub_recipes ON recipe_sub_recipes
  FOR UPDATE
  USING (
    parent_recipe_id IN (
      SELECT id FROM recipes WHERE tenant_id = (
        SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
      )
    )
  )
  WITH CHECK (
    parent_recipe_id IN (
      SELECT id FROM recipes WHERE tenant_id = (
        SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
      )
    )
  );

CREATE POLICY tenant_isolation_delete_recipe_sub_recipes ON recipe_sub_recipes
  FOR DELETE
  USING (
    parent_recipe_id IN (
      SELECT id FROM recipes WHERE tenant_id = (
        SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
      )
    )
  );

-- =====================================================================================
-- TRIGGER: Prevent circular sub-recipe references
-- Uses recursive CTE to walk ancestor chain before allowing insert/update
-- =====================================================================================

CREATE OR REPLACE FUNCTION prevent_circular_sub_recipe()
RETURNS TRIGGER AS $$
DECLARE
  has_cycle BOOLEAN;
BEGIN
  -- Walk from the child upward: does it eventually reach the parent?
  -- If so, adding parent→child would create a cycle.
  WITH RECURSIVE ancestors AS (
    -- Start: all recipes that are parents of the NEW parent_recipe_id
    SELECT parent_recipe_id AS recipe_id
    FROM recipe_sub_recipes
    WHERE child_recipe_id = NEW.parent_recipe_id

    UNION

    -- Walk upward
    SELECT rsr.parent_recipe_id
    FROM recipe_sub_recipes rsr
    JOIN ancestors a ON a.recipe_id = rsr.child_recipe_id
  )
  SELECT EXISTS (
    SELECT 1 FROM ancestors WHERE recipe_id = NEW.child_recipe_id
  ) INTO has_cycle;

  IF has_cycle THEN
    RAISE EXCEPTION 'Circular sub-recipe reference detected: adding % as sub-recipe of % would create a cycle',
      NEW.child_recipe_id, NEW.parent_recipe_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_circular_sub_recipe_trigger
  BEFORE INSERT OR UPDATE ON recipe_sub_recipes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_sub_recipe();

-- =====================================================================================
-- UPDATED FUNCTION: get_recipe_allergen_flags — now walks sub-recipes recursively
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_recipe_allergen_flags(p_recipe_id UUID)
RETURNS TEXT[] AS $$
  WITH RECURSIVE all_recipes AS (
    -- Base: the recipe itself
    SELECT p_recipe_id AS recipe_id

    UNION

    -- Recurse: all sub-recipes (direct + transitive)
    SELECT rsr.child_recipe_id
    FROM recipe_sub_recipes rsr
    JOIN all_recipes ar ON ar.recipe_id = rsr.parent_recipe_id
  )
  SELECT COALESCE(ARRAY_AGG(DISTINCT allergen), ARRAY[]::TEXT[])
  FROM (
    SELECT UNNEST(i.allergen_flags) AS allergen
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id IN (SELECT recipe_id FROM all_recipes)
  ) subquery;
$$ LANGUAGE SQL STABLE;

-- =====================================================================================
-- UPDATED FUNCTION: compute_recipe_cost_cents — now sums sub-recipe costs recursively
-- =====================================================================================

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
      WHEN i.last_price_cents IS NOT NULL THEN
        (ri.quantity * i.last_price_cents * arc.multiplier)::INTEGER
      ELSE 0
    END
  ), 0)
  FROM all_recipe_costs arc
  JOIN recipe_ingredients ri ON ri.recipe_id = arc.recipe_id
  JOIN ingredients i ON i.id = ri.ingredient_id;
$$ LANGUAGE SQL STABLE;
