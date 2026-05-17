-- Saturation Tracking: Chef Capacity Configs
-- Stores per-tenant capacity limits for saturation computations.
-- ADDITIVE ONLY. No existing tables modified.

CREATE TABLE IF NOT EXISTS chef_capacity_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  max_events_per_day INTEGER NOT NULL DEFAULT 2,
  max_events_per_week INTEGER NOT NULL DEFAULT 7,
  prep_days_before INTEGER NOT NULL DEFAULT 1,
  rest_days_after INTEGER NOT NULL DEFAULT 0,
  blackout_days_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One config row per tenant
CREATE UNIQUE INDEX idx_chef_capacity_configs_tenant ON chef_capacity_configs(tenant_id);

-- RLS policies
ALTER TABLE chef_capacity_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs manage own capacity configs"
  ON chef_capacity_configs
  FOR ALL
  TO public
  USING (tenant_id IN (
    SELECT user_roles.entity_id
    FROM user_roles
    WHERE user_roles.auth_user_id = auth.uid()
      AND user_roles.role = 'chef'::user_role
  ))
  WITH CHECK (tenant_id IN (
    SELECT user_roles.entity_id
    FROM user_roles
    WHERE user_roles.auth_user_id = auth.uid()
      AND user_roles.role = 'chef'::user_role
  ));

CREATE POLICY "Service role manages capacity configs"
  ON chef_capacity_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Constraints
ALTER TABLE chef_capacity_configs
  ADD CONSTRAINT chef_capacity_configs_max_events_per_day_check
  CHECK (max_events_per_day >= 1 AND max_events_per_day <= 10);

ALTER TABLE chef_capacity_configs
  ADD CONSTRAINT chef_capacity_configs_max_events_per_week_check
  CHECK (max_events_per_week >= 1 AND max_events_per_week <= 50);

ALTER TABLE chef_capacity_configs
  ADD CONSTRAINT chef_capacity_configs_prep_days_before_check
  CHECK (prep_days_before >= 0 AND prep_days_before <= 7);

ALTER TABLE chef_capacity_configs
  ADD CONSTRAINT chef_capacity_configs_rest_days_after_check
  CHECK (rest_days_after >= 0 AND rest_days_after <= 7);
