-- Chef Capacity Planning
-- Dedicated settings table for time-block-based capacity management.
-- Private chefs need buffer for prep, travel, shopping, and cleanup
-- that typical service businesses don't account for.

CREATE TABLE IF NOT EXISTS chef_capacity_settings (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                      UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Event count limits
  max_events_per_day             INT NOT NULL DEFAULT 2,
  max_events_per_week            INT NOT NULL DEFAULT 8,

  -- Default time blocks (hours / minutes)
  default_prep_hours             NUMERIC(4,1) NOT NULL DEFAULT 4.0,
  default_travel_minutes         INT NOT NULL DEFAULT 60,
  default_shopping_hours         NUMERIC(4,1) NOT NULL DEFAULT 2.0,
  default_cleanup_hours          NUMERIC(4,1) NOT NULL DEFAULT 1.5,

  -- Buffer between consecutive events
  buffer_between_events_minutes  INT NOT NULL DEFAULT 120,

  -- Recurring blocked days (e.g. ['Sunday'])
  blocked_days                   TEXT[] NOT NULL DEFAULT '{}',

  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chef_capacity_settings_tenant_unique UNIQUE (tenant_id),
  CONSTRAINT chk_max_events_day CHECK (max_events_per_day >= 1 AND max_events_per_day <= 10),
  CONSTRAINT chk_max_events_week CHECK (max_events_per_week >= 1 AND max_events_per_week <= 50),
  CONSTRAINT chk_prep_hours CHECK (default_prep_hours >= 0 AND default_prep_hours <= 24),
  CONSTRAINT chk_travel_minutes CHECK (default_travel_minutes >= 0 AND default_travel_minutes <= 480),
  CONSTRAINT chk_shopping_hours CHECK (default_shopping_hours >= 0 AND default_shopping_hours <= 24),
  CONSTRAINT chk_cleanup_hours CHECK (default_cleanup_hours >= 0 AND default_cleanup_hours <= 24),
  CONSTRAINT chk_buffer_minutes CHECK (buffer_between_events_minutes >= 0 AND buffer_between_events_minutes <= 480)
);

CREATE INDEX IF NOT EXISTS idx_capacity_settings_tenant ON chef_capacity_settings(tenant_id);

COMMENT ON TABLE chef_capacity_settings IS 'Per-chef capacity planning defaults: time blocks for prep, travel, shopping, cleanup, plus daily/weekly limits and blocked days.';

DROP TRIGGER IF EXISTS trg_capacity_settings_updated_at ON chef_capacity_settings;
CREATE TRIGGER trg_capacity_settings_updated_at
  BEFORE UPDATE ON chef_capacity_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE chef_capacity_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY capacity_settings_chef_select ON chef_capacity_settings FOR SELECT USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY capacity_settings_chef_insert ON chef_capacity_settings FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY capacity_settings_chef_update ON chef_capacity_settings FOR UPDATE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY capacity_settings_chef_delete ON chef_capacity_settings FOR DELETE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
