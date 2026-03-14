-- Chef Scheduling Rules
-- One row per chef. Defines hard blocks ("no Sundays"), soft limits (max events/week),
-- and booking constraints (min lead days). Used by event creation, inquiry intake,
-- and the future public booking page.
-- Additive migration: new table only.

CREATE TABLE IF NOT EXISTS chef_scheduling_rules (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL UNIQUE REFERENCES chefs(id) ON DELETE CASCADE,
  blocked_days_of_week    INTEGER[] NOT NULL DEFAULT '{}',  -- 0=Sun, 1=Mon ... 6=Sat (hard blocks)
  max_events_per_week     INTEGER,                          -- NULL = no limit
  max_events_per_month    INTEGER,
  min_buffer_days         INTEGER NOT NULL DEFAULT 0,       -- min days between events
  min_lead_days           INTEGER NOT NULL DEFAULT 0,       -- min advance notice for new bookings
  preferred_days_of_week  INTEGER[] NOT NULL DEFAULT '{}',  -- soft preference (advisory only)
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE chef_scheduling_rules
  ADD CONSTRAINT csr_buffer_days_nonneg CHECK (min_buffer_days >= 0),
  ADD CONSTRAINT csr_lead_days_nonneg   CHECK (min_lead_days >= 0),
  ADD CONSTRAINT csr_max_week_pos       CHECK (max_events_per_week IS NULL OR max_events_per_week > 0),
  ADD CONSTRAINT csr_max_month_pos      CHECK (max_events_per_month IS NULL OR max_events_per_month > 0);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_chef_scheduling_rules_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chef_scheduling_rules_updated_at
  BEFORE UPDATE ON chef_scheduling_rules
  FOR EACH ROW EXECUTE FUNCTION update_chef_scheduling_rules_updated_at();

-- Index for quick tenant lookup
CREATE INDEX IF NOT EXISTS idx_chef_scheduling_rules_tenant ON chef_scheduling_rules(tenant_id);

-- RLS
ALTER TABLE chef_scheduling_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef can manage own scheduling rules"
  ON chef_scheduling_rules
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Grant
GRANT ALL ON chef_scheduling_rules TO authenticated;
