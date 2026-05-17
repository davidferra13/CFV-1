CREATE TABLE IF NOT EXISTS undo_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_ids TEXT[] NOT NULL DEFAULT '{}',
  previous_state JSONB NOT NULL DEFAULT '[]',
  description TEXT NOT NULL,
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  undone BOOLEAN NOT NULL DEFAULT false,
  undone_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_undo_tenant_expires ON undo_records(tenant_id, expires_at) WHERE undone = false;
