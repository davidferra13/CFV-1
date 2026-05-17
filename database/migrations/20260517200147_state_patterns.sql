CREATE TABLE IF NOT EXISTS state_pattern_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  component TEXT NOT NULL,
  state_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  icon TEXT,
  action_label TEXT,
  action_href TEXT,
  illustration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_state_pattern_unique ON state_pattern_configs(tenant_id, route, component, state_type);

CREATE TABLE IF NOT EXISTS state_pattern_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  component TEXT NOT NULL,
  has_empty_state BOOLEAN DEFAULT FALSE,
  has_loading_state BOOLEAN DEFAULT FALSE,
  has_error_state BOOLEAN DEFAULT FALSE,
  has_success_state BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  audited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
