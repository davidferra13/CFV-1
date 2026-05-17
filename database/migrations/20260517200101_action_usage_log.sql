CREATE TABLE IF NOT EXISTS action_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  action_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_usage_tenant ON action_usage_log(tenant_id, action_name);
CREATE INDEX idx_action_usage_recent ON action_usage_log(tenant_id, performed_at DESC);

ALTER TABLE action_usage_log ENABLE ROW LEVEL SECURITY;
