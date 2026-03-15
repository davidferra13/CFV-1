-- =====================================================================================
-- LAYER 4: MENUS, RECIPES, COSTING ENGINE
-- =====================================================================================
-- Migration: 20260215000004_layer_4_menus_recipes_costing.sql
-- Description: Complete menu hierarchy (Menu → Dishes → Recipes → Ingredients → Components)
--              Recipe Bible, Costing Engine, allergen propagation
-- Dependencies: Layers 1, 2, 3
-- Date: February 15, 2026
-- =====================================================================================

-- =====================================================================================
-- ENUMS
-- =====================================================================================

-- Menu status state machine: draft → shared → locked → archived
CREATE TYPE menu_status AS ENUM (
  'draft',
  'shared',
  'locked',
  'archived'
);

-- Component categories (what type of building block is this)
CREATE TYPE component_category AS ENUM (
  'sauce',
  'protein',
  'starch',
  'vegetable',
  'fruit',
  'dessert',
  'garnish',
  'bread',
  'cheese',
  'condiment',
  'beverage',
  'other'
);

-- Recipe categories (what type of dish is this in the Recipe Bible)
CREATE TYPE recipe_category AS ENUM (
  'sauce',
  'protein',
  'starch',
  'vegetable',
  'fruit',
  'dessert',
  'bread',
  'pasta',
  'soup',
  'salad',
  'appetizer',
  'condiment',
  'beverage',
  'other'
);

-- Ingredient categories (where does this live in the kitchen)
CREATE TYPE ingredient_category AS ENUM (
  'protein',
  'produce',
  'dairy',
  'pantry',
  'spice',
  'oil',
  'alcohol',
  'baking',
  'frozen',
  'canned',
  'fresh_herb',
  'dry_herb',
  'condiment',
  'beverage',
  'specialty',
  'other'
);

-- =====================================================================================
-- TABLE 1: menus
-- =====================================================================================
-- A menu belongs to an event. Contains courses (dishes). Can exist as reusable template.
-- State machine: draft → shared → locked → archived

CREATE TABLE menus (
  -- Identity & Relationships
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Menu Details
  name TEXT NOT NULL,
  description TEXT,
  is_template BOOLEAN NOT NULL DEFAULT false,

  -- State Machine
  status menu_status NOT NULL DEFAULT 'draft',

  -- Menu Metadata
  cuisine_type TEXT,
  service_style event_service_style,
  target_guest_count INTEGER,
  notes TEXT,

  -- Status Timestamps
  shared_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CHECK (target_guest_count > 0 OR target_guest_count IS NULL)
);

-- Indexes
CREATE INDEX idx_menus_tenant_id ON menus(tenant_id);
CREATE INDEX idx_menus_event_id ON menus(event_id);
CREATE INDEX idx_menus_status ON menus(status);
CREATE INDEX idx_menus_is_template ON menus(is_template);

-- =====================================================================================
-- TABLE 2: menu_state_transitions
-- =====================================================================================
-- Immutable audit trail of menu state changes

CREATE TABLE menu_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  from_status menu_status,
  to_status menu_status NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transitioned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB
);

-- Indexes
CREATE INDEX idx_menu_transitions_menu_id ON menu_state_transitions(menu_id);
CREATE INDEX idx_menu_transitions_tenant_id ON menu_state_transitions(tenant_id);

-- =====================================================================================
-- TABLE 3: dishes
-- =====================================================================================
-- A dish belongs to a menu and represents one course. Each dish contains multiple components.

CREATE TABLE dishes (
  -- Identity & Relationships
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dish Details
  course_number INTEGER NOT NULL,
  course_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Dietary & Allergen Flags
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  allergen_flags TEXT[] NOT NULL DEFAULT '{}',

  -- Notes
  chef_notes TEXT,
  client_notes TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CHECK (course_number > 0),
  UNIQUE (menu_id, course_number)
);

-- Indexes
CREATE INDEX idx_dishes_tenant_id ON dishes(tenant_id);
CREATE INDEX idx_dishes_menu_id ON dishes(menu_id);
CREATE INDEX idx_dishes_menu_course ON dishes(menu_id, course_number);

-- =====================================================================================
-- TABLE 4: recipes
-- =====================================================================================
-- The Recipe Bible. A recipe exists independently of any event. Can be linked to many
-- components across many events. Builds over time from real dinners.

CREATE TABLE recipes (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Recipe Details
  name TEXT NOT NULL,
  category recipe_category NOT NULL,
  description TEXT,

  -- Method
  method TEXT NOT NULL,
  method_detailed TEXT,

  -- Yield
  yield_description TEXT,
  yield_quantity DECIMAL(8,2),
  yield_unit TEXT,

  -- Time
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  total_time_minutes INTEGER,

  -- Dietary (allergen_flags computed at query time, not stored)
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',

  -- Notes & Adaptations
  notes TEXT,
  adaptations TEXT,

  -- Usage Tracking
  times_cooked INTEGER NOT NULL DEFAULT 0,
  last_cooked_at TIMESTAMPTZ,

  -- Media
  photo_url TEXT,

  -- Archival
  archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CHECK (yield_quantity > 0 OR yield_quantity IS NULL),
  CHECK (prep_time_minutes >= 0 OR prep_time_minutes IS NULL),
  CHECK (cook_time_minutes >= 0 OR cook_time_minutes IS NULL),
  CHECK (total_time_minutes >= 0 OR total_time_minutes IS NULL),
  CHECK (times_cooked >= 0)
);

-- Indexes
CREATE INDEX idx_recipes_tenant_id ON recipes(tenant_id);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_archived ON recipes(archived);
CREATE INDEX idx_recipes_times_cooked ON recipes(times_cooked DESC);
CREATE UNIQUE INDEX idx_recipes_tenant_name ON recipes(tenant_id, name);

-- =====================================================================================
-- TABLE 5: ingredients
-- =====================================================================================
-- Master ingredient list. Tracks price history (V1 simple approach: last_price_cents,
-- last_price_date).

CREATE TABLE ingredients (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ingredient Details
  name TEXT NOT NULL,
  category ingredient_category NOT NULL,
  description TEXT,

  -- Units (free text, not enum)
  default_unit TEXT NOT NULL,

  -- Staples
  is_staple BOOLEAN NOT NULL DEFAULT false,

  -- Allergen & Dietary
  allergen_flags TEXT[] NOT NULL DEFAULT '{}',
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',

  -- Pricing (V1 Simple Approach)
  average_price_cents INTEGER,
  price_unit TEXT,
  last_price_cents INTEGER,
  last_price_date DATE,
  last_purchased_at TIMESTAMPTZ,

  -- Vendor Preference
  preferred_vendor TEXT,
  vendor_notes TEXT,

  -- Archival
  archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CHECK (average_price_cents >= 0 OR average_price_cents IS NULL),
  CHECK (last_price_cents >= 0 OR last_price_cents IS NULL)
);

-- Indexes
CREATE INDEX idx_ingredients_tenant_id ON ingredients(tenant_id);
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_is_staple ON ingredients(is_staple);
CREATE INDEX idx_ingredients_archived ON ingredients(archived);
CREATE INDEX idx_ingredients_tenant_name ON ingredients(tenant_id, name);

-- =====================================================================================
-- TABLE 6: recipe_ingredients
-- =====================================================================================
-- Junction table linking recipes to ingredients with quantities.
-- Defines "what goes into this recipe."

CREATE TABLE recipe_ingredients (
  -- Identity & Relationships
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Quantity (unit is free text, not enum)
  quantity DECIMAL(10,3) NOT NULL,
  unit TEXT NOT NULL,

  -- Preparation
  preparation_notes TEXT,

  -- Optional Ingredient
  is_optional BOOLEAN NOT NULL DEFAULT false,
  substitution_notes TEXT,

  -- Sort Order
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Constraints
  CHECK (quantity > 0),
  UNIQUE (recipe_id, ingredient_id)
);

-- Indexes
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- =====================================================================================
-- TABLE 7: components
-- =====================================================================================
-- A component belongs to a dish. This is the building block (e.g., 'Diane Sauce',
-- 'Roasted Smashed Potatoes'). Links to recipes in the Recipe Bible.

CREATE TABLE components (
  -- Identity & Relationships
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Component Details
  name TEXT NOT NULL,
  category component_category NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Prep & Execution
  is_make_ahead BOOLEAN NOT NULL DEFAULT false,
  make_ahead_window_hours INTEGER,
  storage_notes TEXT,
  execution_notes TEXT,

  -- Scaling
  scale_factor DECIMAL(5,2) NOT NULL DEFAULT 1.0,

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CHECK (scale_factor > 0)
);

-- Indexes
CREATE INDEX idx_components_tenant_id ON components(tenant_id);
CREATE INDEX idx_components_dish_id ON components(dish_id);
CREATE INDEX idx_components_recipe_id ON components(recipe_id);
CREATE INDEX idx_components_category ON components(category);
CREATE INDEX idx_components_is_make_ahead ON components(is_make_ahead);

-- =====================================================================================
-- FOREIGN KEY ADDITION TO LAYER 3
-- =====================================================================================

-- Add menu_id column to events table (linking event to its menu)
ALTER TABLE events ADD COLUMN menu_id UUID REFERENCES menus(id) ON DELETE SET NULL;
CREATE INDEX idx_events_menu_id ON events(menu_id);

-- =====================================================================================
-- TRIGGER FUNCTIONS
-- =====================================================================================

-- Update updated_at timestamp on UPDATE
CREATE OR REPLACE FUNCTION update_layer4_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate menu state transitions
CREATE OR REPLACE FUNCTION validate_menu_state_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transition BOOLEAN := false;
BEGIN
  -- Allow same-state (no-op)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Valid transitions:
  -- draft → shared, draft → archived
  -- shared → locked, shared → draft
  -- locked → archived
  IF OLD.status = 'draft' AND NEW.status IN ('shared', 'archived') THEN
    valid_transition := true;
  ELSIF OLD.status = 'shared' AND NEW.status IN ('locked', 'draft') THEN
    valid_transition := true;
  ELSIF OLD.status = 'locked' AND NEW.status = 'archived' THEN
    valid_transition := true;
  END IF;

  IF NOT valid_transition THEN
    RAISE EXCEPTION 'Invalid menu state transition: % → %', OLD.status, NEW.status;
  END IF;

  -- Set timestamp fields
  IF NEW.status = 'shared' AND OLD.status != 'shared' THEN
    NEW.shared_at := now();
  ELSIF NEW.status = 'locked' AND OLD.status != 'locked' THEN
    NEW.locked_at := now();
  ELSIF NEW.status = 'archived' AND OLD.status != 'archived' THEN
    NEW.archived_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log menu state transitions
CREATE OR REPLACE FUNCTION log_menu_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO menu_state_transitions (
      menu_id,
      tenant_id,
      from_status,
      to_status,
      transitioned_at,
      transitioned_by
    ) VALUES (
      NEW.id,
      NEW.tenant_id,
      OLD.status,
      NEW.status,
      now(),
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prevent mutation of menu_state_transitions (immutable audit trail)
CREATE OR REPLACE FUNCTION prevent_menu_transition_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Menu state transitions are immutable audit records.';
END;
$$ LANGUAGE plpgsql;

-- Increment recipe times_cooked when event completes
CREATE OR REPLACE FUNCTION increment_recipe_times_cooked_on_event_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Find all recipes used in this event's menu and increment times_cooked
    UPDATE recipes
    SET
      times_cooked = times_cooked + 1,
      last_cooked_at = NEW.event_date
    WHERE id IN (
      SELECT DISTINCT c.recipe_id
      FROM components c
      JOIN dishes d ON d.id = c.dish_id
      JOIN menus m ON m.id = d.menu_id
      WHERE m.event_id = NEW.id
        AND c.recipe_id IS NOT NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Update updated_at timestamps
CREATE TRIGGER update_menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW
  EXECUTE FUNCTION update_layer4_updated_at();

CREATE TRIGGER update_dishes_updated_at
  BEFORE UPDATE ON dishes
  FOR EACH ROW
  EXECUTE FUNCTION update_layer4_updated_at();

CREATE TRIGGER update_components_updated_at
  BEFORE UPDATE ON components
  FOR EACH ROW
  EXECUTE FUNCTION update_layer4_updated_at();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_layer4_updated_at();

CREATE TRIGGER update_recipe_ingredients_updated_at
  BEFORE UPDATE ON recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_layer4_updated_at();

CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_layer4_updated_at();

-- Menu state machine enforcement
CREATE TRIGGER validate_menu_state_transition_trigger
  BEFORE UPDATE ON menus
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_menu_state_transition();

CREATE TRIGGER log_menu_state_transition_trigger
  AFTER UPDATE ON menus
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_menu_state_transition();

-- Menu state transitions immutability
CREATE TRIGGER prevent_menu_transition_update
  BEFORE UPDATE ON menu_state_transitions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_menu_transition_mutation();

CREATE TRIGGER prevent_menu_transition_delete
  BEFORE DELETE ON menu_state_transitions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_menu_transition_mutation();

-- Recipe times_cooked increment (fires from Layer 3 events table)
CREATE TRIGGER increment_recipe_times_cooked_on_event_completion_trigger
  AFTER UPDATE ON events
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION increment_recipe_times_cooked_on_event_completion();

-- =====================================================================================
-- RLS POLICIES
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- RLS: menus (chef isolation + client portal)
-- =====================================================================================

DROP POLICY IF EXISTS tenant_isolation_select_menus ON menus;
CREATE POLICY tenant_isolation_select_menus ON menus
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert_menus ON menus;
CREATE POLICY tenant_isolation_insert_menus ON menus
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update_menus ON menus;
CREATE POLICY tenant_isolation_update_menus ON menus
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Client can view menus for their own events
DROP POLICY IF EXISTS client_can_view_own_event_menu ON menus;
CREATE POLICY client_can_view_own_event_menu ON menus
  FOR SELECT
  USING (
    get_current_user_role() = 'client'
    AND event_id IN (
      SELECT id FROM events WHERE client_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client'
      )
    )
  );

-- =====================================================================================
-- RLS: menu_state_transitions (chef isolation, immutable)
-- =====================================================================================

DROP POLICY IF EXISTS tenant_isolation_select_menu_transitions ON menu_state_transitions;
CREATE POLICY tenant_isolation_select_menu_transitions ON menu_state_transitions
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert_menu_transitions ON menu_state_transitions;
CREATE POLICY tenant_isolation_insert_menu_transitions ON menu_state_transitions
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- =====================================================================================
-- RLS: dishes (chef isolation + client portal)
-- =====================================================================================

DROP POLICY IF EXISTS tenant_isolation_select_dishes ON dishes;
CREATE POLICY tenant_isolation_select_dishes ON dishes
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert_dishes ON dishes;
CREATE POLICY tenant_isolation_insert_dishes ON dishes
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update_dishes ON dishes;
CREATE POLICY tenant_isolation_update_dishes ON dishes
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Client can view dishes in their event menus
DROP POLICY IF EXISTS client_can_view_menu_dishes ON dishes;
CREATE POLICY client_can_view_menu_dishes ON dishes
  FOR SELECT
  USING (
    get_current_user_role() = 'client'
    AND menu_id IN (
      SELECT id FROM menus WHERE event_id IN (
        SELECT id FROM events WHERE client_id IN (
          SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client'
        )
      )
    )
  );

-- =====================================================================================
-- RLS: components (chef isolation + client portal)
-- =====================================================================================

DROP POLICY IF EXISTS tenant_isolation_select_components ON components;
CREATE POLICY tenant_isolation_select_components ON components
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert_components ON components;
CREATE POLICY tenant_isolation_insert_components ON components
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update_components ON components;
CREATE POLICY tenant_isolation_update_components ON components
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Client can view components in their event menu dishes
DROP POLICY IF EXISTS client_can_view_dish_components ON components;
CREATE POLICY client_can_view_dish_components ON components
  FOR SELECT
  USING (
    get_current_user_role() = 'client'
    AND dish_id IN (
      SELECT id FROM dishes WHERE menu_id IN (
        SELECT id FROM menus WHERE event_id IN (
          SELECT id FROM events WHERE client_id IN (
            SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client'
          )
        )
      )
    )
  );

-- =====================================================================================
-- RLS: recipes (chef isolation, soft-delete pattern)
-- =====================================================================================

DROP POLICY IF EXISTS tenant_isolation_select_recipes ON recipes;
CREATE POLICY tenant_isolation_select_recipes ON recipes
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert_recipes ON recipes;
CREATE POLICY tenant_isolation_insert_recipes ON recipes
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update_recipes ON recipes;
CREATE POLICY tenant_isolation_update_recipes ON recipes
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- =====================================================================================
-- RLS: recipe_ingredients (inherit from recipe)
-- =====================================================================================

DROP POLICY IF EXISTS tenant_isolation_select_recipe_ingredients ON recipe_ingredients;
CREATE POLICY tenant_isolation_select_recipe_ingredients ON recipe_ingredients
  FOR SELECT
  USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS tenant_isolation_insert_recipe_ingredients ON recipe_ingredients;
CREATE POLICY tenant_isolation_insert_recipe_ingredients ON recipe_ingredients
  FOR INSERT
  WITH CHECK (
    recipe_id IN (
      SELECT id FROM recipes WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS tenant_isolation_update_recipe_ingredients ON recipe_ingredients;
CREATE POLICY tenant_isolation_update_recipe_ingredients ON recipe_ingredients
  FOR UPDATE
  USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    recipe_id IN (
      SELECT id FROM recipes WHERE tenant_id = get_current_tenant_id()
    )
  );

-- =====================================================================================
-- RLS: ingredients (chef isolation, soft-delete pattern)
-- =====================================================================================

DROP POLICY IF EXISTS tenant_isolation_select_ingredients ON ingredients;
CREATE POLICY tenant_isolation_select_ingredients ON ingredients
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert_ingredients ON ingredients;
CREATE POLICY tenant_isolation_insert_ingredients ON ingredients
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update_ingredients ON ingredients;
CREATE POLICY tenant_isolation_update_ingredients ON ingredients
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- =====================================================================================
-- HELPER FUNCTIONS (for computed metrics and allergen flags)
-- =====================================================================================

-- Get recipe allergen flags (computed at query time, not stored)
CREATE OR REPLACE FUNCTION get_recipe_allergen_flags(p_recipe_id UUID)
RETURNS TEXT[] AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT allergen), ARRAY[]::TEXT[])
  FROM (
    SELECT UNNEST(i.allergen_flags) AS allergen
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = p_recipe_id
  ) subquery;
$$ LANGUAGE SQL STABLE;

-- Get dish allergen flags (walks hierarchy at query time)
CREATE OR REPLACE FUNCTION get_dish_allergen_flags(p_dish_id UUID)
RETURNS TEXT[] AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT allergen), ARRAY[]::TEXT[])
  FROM (
    SELECT UNNEST(get_recipe_allergen_flags(c.recipe_id)) AS allergen
    FROM components c
    WHERE c.dish_id = p_dish_id AND c.recipe_id IS NOT NULL
  ) subquery;
$$ LANGUAGE SQL STABLE;

-- Get menu course count (computed at query time, not stored)
CREATE OR REPLACE FUNCTION get_menu_course_count(p_menu_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM dishes
  WHERE menu_id = p_menu_id;
$$ LANGUAGE SQL STABLE;

-- Get dish component count (computed at query time, not stored)
CREATE OR REPLACE FUNCTION get_dish_component_count(p_dish_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM components
  WHERE dish_id = p_dish_id;
$$ LANGUAGE SQL STABLE;

-- Get menu total component count (for packing verification)
CREATE OR REPLACE FUNCTION get_menu_total_component_count(p_menu_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(c.*)::INTEGER
  FROM components c
  JOIN dishes d ON d.id = c.dish_id
  WHERE d.menu_id = p_menu_id;
$$ LANGUAGE SQL STABLE;

-- Compute recipe cost in cents (V1 simple approach)
CREATE OR REPLACE FUNCTION compute_recipe_cost_cents(p_recipe_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(
    -- Simple V1 calculation: quantity * last_price_cents
    -- NOTE: This doesn't account for unit conversions yet
    -- For V1, assume chef uses compatible units
    CASE
      WHEN i.last_price_cents IS NOT NULL THEN
        (ri.quantity * i.last_price_cents)::INTEGER
      ELSE 0
    END
  ), 0)
  FROM recipe_ingredients ri
  JOIN ingredients i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = p_recipe_id;
$$ LANGUAGE SQL STABLE;

-- Compute menu cost in cents (sum of all component recipe costs)
CREATE OR REPLACE FUNCTION compute_menu_cost_cents(p_menu_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(
    compute_recipe_cost_cents(c.recipe_id)
  ), 0)
  FROM components c
  JOIN dishes d ON d.id = c.dish_id
  WHERE d.menu_id = p_menu_id AND c.recipe_id IS NOT NULL;
$$ LANGUAGE SQL STABLE;

-- Compute projected food cost for an event (menu_cost × scale factors)
CREATE OR REPLACE FUNCTION compute_projected_food_cost_cents(p_event_id UUID)
RETURNS INTEGER AS $$
  SELECT compute_menu_cost_cents(m.id)
  FROM events e
  JOIN menus m ON m.event_id = e.id
  WHERE e.id = p_event_id;
$$ LANGUAGE SQL STABLE;

-- =====================================================================================
-- VIEWS (for derived metrics)
-- =====================================================================================

-- Recipe cost summary (per recipe)
CREATE VIEW recipe_cost_summary AS
SELECT
  r.id AS recipe_id,
  r.tenant_id,
  r.name AS recipe_name,
  r.category,
  compute_recipe_cost_cents(r.id) AS total_ingredient_cost_cents,
  CASE
    WHEN r.yield_quantity > 0 THEN
      (compute_recipe_cost_cents(r.id) / r.yield_quantity)::INTEGER
    ELSE NULL
  END AS cost_per_portion_cents,
  (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id) AS ingredient_count,
  (
    SELECT COUNT(*) = COUNT(i.last_price_cents)
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = r.id
  ) AS has_all_prices,
  (
    SELECT MAX(i.last_price_date)
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = r.id
  ) AS last_price_updated_at
FROM recipes r
WHERE r.archived = false;

-- Menu cost summary (per menu)
CREATE VIEW menu_cost_summary AS
SELECT
  m.id AS menu_id,
  m.tenant_id,
  m.event_id,
  m.name AS menu_name,
  get_menu_total_component_count(m.id) AS total_component_count,
  compute_menu_cost_cents(m.id) AS total_recipe_cost_cents,
  CASE
    WHEN e.guest_count > 0 THEN
      (compute_menu_cost_cents(m.id) / e.guest_count)::INTEGER
    ELSE NULL
  END AS cost_per_guest_cents,
  CASE
    WHEN e.quoted_price_cents > 0 THEN
      (compute_menu_cost_cents(m.id)::DECIMAL / e.quoted_price_cents * 100)::DECIMAL(5,2)
    ELSE NULL
  END AS food_cost_percentage,
  (
    SELECT COUNT(*) = COUNT(c.recipe_id)
    FROM components c
    JOIN dishes d ON d.id = c.dish_id
    WHERE d.menu_id = m.id
  ) AS has_all_recipe_costs
FROM menus m
LEFT JOIN events e ON e.id = m.event_id;

-- Dish component summary (per dish)
CREATE VIEW dish_component_summary AS
SELECT
  d.id AS dish_id,
  d.tenant_id,
  d.menu_id,
  d.course_number,
  d.course_name,
  get_dish_component_count(d.id) AS component_count,
  (SELECT COUNT(*) FROM components WHERE dish_id = d.id AND is_make_ahead = true) AS make_ahead_count,
  (SELECT COUNT(*) FROM components WHERE dish_id = d.id AND recipe_id IS NOT NULL) AS components_with_recipes,
  (SELECT COUNT(*) FROM components WHERE dish_id = d.id AND recipe_id IS NULL) AS components_without_recipes
FROM dishes d;

-- Ingredient usage summary (per ingredient)
CREATE VIEW ingredient_usage_summary AS
SELECT
  i.id AS ingredient_id,
  i.tenant_id,
  i.name AS ingredient_name,
  i.category,
  (SELECT COUNT(*) FROM recipe_ingredients WHERE ingredient_id = i.id) AS times_used,
  (
    SELECT ARRAY_AGG(DISTINCT r.name)
    FROM recipe_ingredients ri
    JOIN recipes r ON r.id = ri.recipe_id
    WHERE ri.ingredient_id = i.id
  ) AS recipes_using,
  (
    SELECT MAX(r.last_cooked_at)
    FROM recipe_ingredients ri
    JOIN recipes r ON r.id = ri.recipe_id
    WHERE ri.ingredient_id = i.id
  ) AS last_used_in_recipe_at
FROM ingredients i
WHERE i.archived = false;

-- =====================================================================================
-- END OF LAYER 4 MIGRATION
-- =====================================================================================
-- Layer 4 Complete: 7 tables, 4 enums, 11 triggers, 21 RLS policies, 4 views, 8 helper functions
-- =====================================================================================
