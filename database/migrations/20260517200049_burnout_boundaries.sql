-- Burnout Boundaries & Blocked Dates
-- Complements chef_capacity_configs (saturation tracking).
-- This adds boundary-setting and burnout-risk assessment tables.

-- Chef Burnout Boundaries: per-tenant capacity limits for burnout prevention
CREATE TABLE IF NOT EXISTS chef_burnout_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  max_events_per_week INTEGER NOT NULL DEFAULT 7,
  max_guests_per_event INTEGER NOT NULL DEFAULT 20,
  min_rest_days INTEGER NOT NULL DEFAULT 1,
  max_consecutive_days INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chef_burnout_boundaries_max_events_per_week_check
    CHECK ((max_events_per_week >= 1) AND (max_events_per_week <= 50)),
  CONSTRAINT chef_burnout_boundaries_max_guests_per_event_check
    CHECK ((max_guests_per_event >= 1) AND (max_guests_per_event <= 500)),
  CONSTRAINT chef_burnout_boundaries_min_rest_days_check
    CHECK ((min_rest_days >= 0) AND (min_rest_days <= 7)),
  CONSTRAINT chef_burnout_boundaries_max_consecutive_days_check
    CHECK ((max_consecutive_days >= 1) AND (max_consecutive_days <= 14))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_burnout_boundaries_tenant
  ON chef_burnout_boundaries USING btree (tenant_id);

-- Chef Blocked Dates: specific dates blocked for rest/personal
CREATE TABLE IF NOT EXISTS chef_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_blocked_dates_tenant_date
  ON chef_blocked_dates USING btree (tenant_id, blocked_date);

-- RLS policies
ALTER TABLE chef_burnout_boundaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs manage own burnout boundaries"
  ON chef_burnout_boundaries FOR ALL TO public
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ))
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY "Service role manages burnout boundaries"
  ON chef_burnout_boundaries FOR ALL TO public
  USING (true) WITH CHECK (true);

CREATE POLICY "Chefs manage own blocked dates"
  ON chef_blocked_dates FOR ALL TO public
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ))
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY "Service role manages blocked dates"
  ON chef_blocked_dates FOR ALL TO public
  USING (true) WITH CHECK (true);
