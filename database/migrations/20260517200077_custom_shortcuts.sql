CREATE TABLE IF NOT EXISTS custom_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  action TEXT NOT NULL,
  key TEXT NOT NULL,
  modifiers JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_custom_shortcuts_tenant_action ON custom_shortcuts(tenant_id, action);

ALTER TABLE custom_shortcuts ENABLE ROW LEVEL SECURITY;
