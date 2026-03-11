-- Meal Prep Deliveries: tracking individual delivery stops for meal prep programs
-- Additive migration: creates new table, no changes to existing tables

-- Catch up drifted environments where the meal_prep_programs migration was
-- recorded but the table itself is missing.
CREATE TABLE IF NOT EXISTS meal_prep_programs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  recurring_service_id  UUID NOT NULL REFERENCES recurring_services(id) ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  delivery_day          SMALLINT NOT NULL DEFAULT 1 CHECK (delivery_day BETWEEN 0 AND 6),
  delivery_window_start TEXT NOT NULL DEFAULT '10:00',
  delivery_window_end   TEXT NOT NULL DEFAULT '14:00',
  delivery_address      TEXT,
  delivery_instructions TEXT,
  containers_out        INTEGER NOT NULL DEFAULT 0,
  containers_returned   INTEGER NOT NULL DEFAULT 0,
  container_deposit_cents INTEGER NOT NULL DEFAULT 0,
  rotation_weeks        INTEGER NOT NULL DEFAULT 4 CHECK (rotation_weeks BETWEEN 1 AND 12),
  current_rotation_week INTEGER NOT NULL DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'ended')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meal_prep_programs_tenant
  ON meal_prep_programs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_meal_prep_programs_client
  ON meal_prep_programs(tenant_id, client_id);
DROP TRIGGER IF EXISTS trg_meal_prep_programs_updated_at ON meal_prep_programs;
CREATE TRIGGER trg_meal_prep_programs_updated_at
  BEFORE UPDATE ON meal_prep_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE meal_prep_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mpp_chef_select ON meal_prep_programs;
CREATE POLICY mpp_chef_select ON meal_prep_programs FOR SELECT
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS mpp_chef_insert ON meal_prep_programs;
CREATE POLICY mpp_chef_insert ON meal_prep_programs FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS mpp_chef_update ON meal_prep_programs;
CREATE POLICY mpp_chef_update ON meal_prep_programs FOR UPDATE
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS mpp_chef_delete ON meal_prep_programs;
CREATE POLICY mpp_chef_delete ON meal_prep_programs FOR DELETE
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
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
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef inserts own deliveries"
  ON meal_prep_deliveries FOR INSERT
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef updates own deliveries"
  ON meal_prep_deliveries FOR UPDATE
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE POLICY "Chef deletes own deliveries"
  ON meal_prep_deliveries FOR DELETE
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
-- Updated_at trigger
CREATE TRIGGER set_meal_prep_deliveries_updated_at
  BEFORE UPDATE ON meal_prep_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
