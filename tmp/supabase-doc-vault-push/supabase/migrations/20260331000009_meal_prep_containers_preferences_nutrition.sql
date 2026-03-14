-- Meal Prep: Container Inventory, Client Preferences, Recipe Nutrition
-- Additive migration: creates new tables only, no changes to existing tables

-- ============================================
-- Feature 1: Container Inventory Management
-- ============================================

CREATE TABLE IF NOT EXISTS container_inventory (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  container_type        text NOT NULL CHECK (container_type IN (
    'small_round', 'medium_round', 'large_rect', 'soup_cup', 'salad_bowl', 'custom'
  )),
  custom_label          text, -- only used when container_type = 'custom'
  material              text NOT NULL DEFAULT 'plastic' CHECK (material IN (
    'plastic', 'glass', 'aluminum', 'compostable'
  )),
  is_reusable           boolean NOT NULL DEFAULT true,
  total_owned           integer NOT NULL DEFAULT 0,
  currently_available   integer NOT NULL DEFAULT 0,
  deployed_count        integer NOT NULL DEFAULT 0,
  retired_count         integer NOT NULL DEFAULT 0,
  cost_per_unit_cents   integer,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_container_inventory_chef
  ON container_inventory(chef_id);
ALTER TABLE container_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chef sees own container inventory"
  ON container_inventory FOR SELECT
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef inserts own container inventory"
  ON container_inventory FOR INSERT
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef updates own container inventory"
  ON container_inventory FOR UPDATE
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef deletes own container inventory"
  ON container_inventory FOR DELETE
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE TRIGGER set_container_inventory_updated_at
  BEFORE UPDATE ON container_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Container Transactions
CREATE TABLE IF NOT EXISTS container_transactions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  container_type_id     uuid NOT NULL REFERENCES container_inventory(id) ON DELETE CASCADE,
  transaction_type      text NOT NULL CHECK (transaction_type IN (
    'purchase', 'deploy', 'return', 'retire', 'lost'
  )),
  quantity              integer NOT NULL CHECK (quantity > 0),
  client_id             uuid REFERENCES clients(id) ON DELETE SET NULL,
  program_id            uuid REFERENCES meal_prep_programs(id) ON DELETE SET NULL,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_container_transactions_chef
  ON container_transactions(chef_id);
CREATE INDEX idx_container_transactions_type
  ON container_transactions(container_type_id);
CREATE INDEX idx_container_transactions_client
  ON container_transactions(client_id);
ALTER TABLE container_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chef sees own container transactions"
  ON container_transactions FOR SELECT
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef inserts own container transactions"
  ON container_transactions FOR INSERT
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
-- ============================================
-- Feature 2: Client Meal Prep Preferences
-- ============================================

CREATE TABLE IF NOT EXISTS client_meal_prep_preferences (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                 uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id               uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  dietary_restrictions     text[] NOT NULL DEFAULT '{}',
  allergies               text[] NOT NULL DEFAULT '{}',
  dislikes                text NOT NULL DEFAULT '',
  spice_tolerance         text NOT NULL DEFAULT 'medium' CHECK (spice_tolerance IN (
    'none', 'mild', 'medium', 'hot'
  )),
  favorite_cuisines       text[] NOT NULL DEFAULT '{}',
  dietary_protocols       text NOT NULL DEFAULT '',
  household_size          integer NOT NULL DEFAULT 1,
  adults                  integer NOT NULL DEFAULT 1,
  children                integer NOT NULL DEFAULT 0,
  meals_per_week          integer NOT NULL DEFAULT 5,
  preferred_proteins      text[] NOT NULL DEFAULT '{}',
  avoid_proteins          text[] NOT NULL DEFAULT '{}',
  carb_preference         text NOT NULL DEFAULT 'normal' CHECK (carb_preference IN (
    'normal', 'low_carb', 'no_carb'
  )),
  portion_size            text NOT NULL DEFAULT 'regular' CHECK (portion_size IN (
    'small', 'regular', 'large'
  )),
  delivery_address        text NOT NULL DEFAULT '',
  delivery_instructions   text NOT NULL DEFAULT '',
  preferred_delivery_day  integer NOT NULL DEFAULT 1 CHECK (preferred_delivery_day BETWEEN 0 AND 6),
  delivery_window         text NOT NULL DEFAULT 'morning' CHECK (delivery_window IN (
    'morning', 'afternoon', 'evening'
  )),
  container_preference    text NOT NULL DEFAULT 'reusable' CHECK (container_preference IN (
    'reusable', 'disposable'
  )),
  weekly_budget_cents     integer,
  notes                   text NOT NULL DEFAULT '',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chef_id, client_id)
);
CREATE INDEX idx_client_meal_prep_preferences_chef
  ON client_meal_prep_preferences(chef_id);
CREATE INDEX idx_client_meal_prep_preferences_client
  ON client_meal_prep_preferences(client_id);
ALTER TABLE client_meal_prep_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chef sees own client preferences"
  ON client_meal_prep_preferences FOR SELECT
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef inserts own client preferences"
  ON client_meal_prep_preferences FOR INSERT
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef updates own client preferences"
  ON client_meal_prep_preferences FOR UPDATE
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef deletes own client preferences"
  ON client_meal_prep_preferences FOR DELETE
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE TRIGGER set_client_meal_prep_preferences_updated_at
  BEFORE UPDATE ON client_meal_prep_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- Feature 3: Recipe Nutrition Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS recipe_nutrition (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  recipe_id       uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  calories        integer NOT NULL DEFAULT 0,
  protein_g       numeric(6,1) NOT NULL DEFAULT 0,
  carbs_g         numeric(6,1) NOT NULL DEFAULT 0,
  fat_g           numeric(6,1) NOT NULL DEFAULT 0,
  fiber_g         numeric(6,1),
  sodium_mg       numeric(8,1),
  source          text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'calculated', 'imported')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chef_id, recipe_id)
);
CREATE INDEX idx_recipe_nutrition_chef
  ON recipe_nutrition(chef_id);
CREATE INDEX idx_recipe_nutrition_recipe
  ON recipe_nutrition(recipe_id);
ALTER TABLE recipe_nutrition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chef sees own recipe nutrition"
  ON recipe_nutrition FOR SELECT
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef inserts own recipe nutrition"
  ON recipe_nutrition FOR INSERT
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef updates own recipe nutrition"
  ON recipe_nutrition FOR UPDATE
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef deletes own recipe nutrition"
  ON recipe_nutrition FOR DELETE
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE TRIGGER set_recipe_nutrition_updated_at
  BEFORE UPDATE ON recipe_nutrition
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
