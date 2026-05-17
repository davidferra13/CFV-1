CREATE TABLE IF NOT EXISTS setting_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_setting_values_tenant_key ON setting_values(tenant_id, key);
ALTER TABLE setting_values ENABLE ROW LEVEL SECURITY;
