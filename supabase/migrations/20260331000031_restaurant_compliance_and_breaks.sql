-- Restaurant Archetype Features: Compliance Logs + Staff Break Tracking
-- Adds daily temperature logging, cleaning checklists, and break tracking
-- for staff clock entries.

-- ============================================
-- TABLE 1: COMPLIANCE TEMPERATURE LOGS
-- Daily food-safety temperature readings (not event-specific like event_temp_logs)
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_temp_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  log_date          DATE NOT NULL DEFAULT CURRENT_DATE,

  location          TEXT NOT NULL DEFAULT 'walk_in_cooler'
                    CHECK (location IN (
                      'walk_in_cooler',
                      'walk_in_freezer',
                      'prep_fridge',
                      'hot_holding',
                      'cold_holding',
                      'dish_machine',
                      'custom'
                    )),
  location_label    TEXT,               -- custom label when location = 'custom'

  temperature_f     NUMERIC(5,1) NOT NULL,
  target_min_f      NUMERIC(5,1),       -- acceptable range min
  target_max_f      NUMERIC(5,1),       -- acceptable range max
  is_in_range       BOOLEAN,            -- computed: temp between min and max

  corrective_action TEXT,               -- what was done if out of range
  recorded_by       TEXT,               -- staff name
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_temp_chef_date ON compliance_temp_logs(chef_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_temp_alerts ON compliance_temp_logs(chef_id, is_in_range) WHERE is_in_range = false;

COMMENT ON TABLE compliance_temp_logs IS 'Daily food-safety temperature readings for walk-ins, holding units, and equipment.';

-- ============================================
-- TABLE 2: COMPLIANCE CLEANING LOGS
-- Daily cleaning checklist tasks
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_cleaning_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  log_date          DATE NOT NULL DEFAULT CURRENT_DATE,

  task_name         TEXT NOT NULL,       -- 'sanitize_cutting_boards', etc.
  area              TEXT NOT NULL DEFAULT 'kitchen'
                    CHECK (area IN ('kitchen', 'foh', 'restroom', 'storage', 'exterior')),

  completed         BOOLEAN NOT NULL DEFAULT false,
  completed_by      TEXT,
  completed_at      TIMESTAMPTZ,
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_cleaning_chef_date ON compliance_cleaning_logs(chef_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_cleaning_area ON compliance_cleaning_logs(chef_id, area);

COMMENT ON TABLE compliance_cleaning_logs IS 'Daily cleaning checklist tasks grouped by area (kitchen, FOH, restroom, storage).';

-- ============================================
-- ALTER: Add break tracking to staff_clock_entries
-- ============================================

ALTER TABLE staff_clock_entries ADD COLUMN IF NOT EXISTS break_start_at TIMESTAMPTZ;
ALTER TABLE staff_clock_entries ADD COLUMN IF NOT EXISTS break_end_at TIMESTAMPTZ;
ALTER TABLE staff_clock_entries ADD COLUMN IF NOT EXISTS break_minutes INTEGER DEFAULT 0;
ALTER TABLE staff_clock_entries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE staff_clock_entries ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;
ALTER TABLE staff_clock_entries ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE compliance_temp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_cleaning_logs ENABLE ROW LEVEL SECURITY;

-- Temperature logs
DO $$ BEGIN
  CREATE POLICY ctl_chef_select ON compliance_temp_logs
    FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY ctl_chef_insert ON compliance_temp_logs
    FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY ctl_chef_update ON compliance_temp_logs
    FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY ctl_chef_delete ON compliance_temp_logs
    FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cleaning logs
DO $$ BEGIN
  CREATE POLICY ccl_chef_select ON compliance_cleaning_logs
    FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY ccl_chef_insert ON compliance_cleaning_logs
    FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY ccl_chef_update ON compliance_cleaning_logs
    FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY ccl_chef_delete ON compliance_cleaning_logs
    FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
