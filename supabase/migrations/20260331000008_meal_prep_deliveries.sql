-- Meal Prep Deliveries: tracking individual delivery stops for meal prep programs
-- Additive migration: creates new table, no changes to existing tables

CREATE TABLE IF NOT EXISTS meal_prep_deliveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  program_id      uuid NOT NULL REFERENCES meal_prep_programs(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  delivery_date   date NOT NULL,
  delivery_address text NOT NULL,
  delivery_instructions text,
  meal_count      integer NOT NULL DEFAULT 0,
  container_count integer NOT NULL DEFAULT 0,
  delivery_order  integer NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'in_transit', 'delivered', 'no_answer', 'cancelled')),
  scheduled_time  time,
  actual_delivery_time timestamptz,
  delivery_notes  text,
  photo_url       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for fast date-based lookups
CREATE INDEX idx_meal_prep_deliveries_chef_date
  ON meal_prep_deliveries(chef_id, delivery_date);

CREATE INDEX idx_meal_prep_deliveries_program
  ON meal_prep_deliveries(program_id);

CREATE INDEX idx_meal_prep_deliveries_client
  ON meal_prep_deliveries(client_id);

-- RLS
ALTER TABLE meal_prep_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef sees own deliveries"
  ON meal_prep_deliveries FOR SELECT
  USING (chef_id IN (SELECT id FROM chefs WHERE user_id = auth.uid()));

CREATE POLICY "Chef inserts own deliveries"
  ON meal_prep_deliveries FOR INSERT
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE user_id = auth.uid()));

CREATE POLICY "Chef updates own deliveries"
  ON meal_prep_deliveries FOR UPDATE
  USING (chef_id IN (SELECT id FROM chefs WHERE user_id = auth.uid()));

CREATE POLICY "Chef deletes own deliveries"
  ON meal_prep_deliveries FOR DELETE
  USING (chef_id IN (SELECT id FROM chefs WHERE user_id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER set_meal_prep_deliveries_updated_at
  BEFORE UPDATE ON meal_prep_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
