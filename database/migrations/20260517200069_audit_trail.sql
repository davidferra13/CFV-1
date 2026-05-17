CREATE TABLE IF NOT EXISTS audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID NOT NULL,
  actor_name TEXT,
  changes JSONB NOT NULL DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_entries(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_entries(tenant_id, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_entries(tenant_id, created_at DESC);
