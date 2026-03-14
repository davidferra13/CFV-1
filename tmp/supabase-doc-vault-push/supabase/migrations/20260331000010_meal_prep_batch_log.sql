-- Meal Prep Batch Log: track actual vs expected portions, waste, and cost variance
-- Additive migration: creates new table only

CREATE TABLE IF NOT EXISTS meal_prep_batch_log (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                  uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  batch_date               date NOT NULL DEFAULT CURRENT_DATE,
  recipe_id                uuid REFERENCES recipes(id) ON DELETE SET NULL,
  dish_name                text NOT NULL,
  planned_portions         integer NOT NULL CHECK (planned_portions >= 0),
  actual_portions          integer NOT NULL CHECK (actual_portions >= 0),
  waste_portions           integer NOT NULL DEFAULT 0 CHECK (waste_portions >= 0),
  waste_reason             text CHECK (waste_reason IN ('overcooked', 'underseasoned', 'contamination', 'excess', 'other')),
  ingredient_waste_notes   text,
  cost_per_portion_cents   integer,
  total_ingredient_cost_cents integer,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_meal_prep_batch_log_chef_date
  ON meal_prep_batch_log(chef_id, batch_date);
CREATE INDEX idx_meal_prep_batch_log_recipe
  ON meal_prep_batch_log(recipe_id)
  WHERE recipe_id IS NOT NULL;
-- RLS
ALTER TABLE meal_prep_batch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chef sees own batch logs"
  ON meal_prep_batch_log FOR SELECT
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef inserts own batch logs"
  ON meal_prep_batch_log FOR INSERT
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef updates own batch logs"
  ON meal_prep_batch_log FOR UPDATE
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef deletes own batch logs"
  ON meal_prep_batch_log FOR DELETE
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
