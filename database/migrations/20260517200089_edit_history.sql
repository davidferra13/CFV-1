CREATE TABLE IF NOT EXISTS edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  edited_by TEXT NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reverted BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_edit_history_entity ON edit_history(tenant_id, entity_type, entity_id);
CREATE INDEX idx_edit_history_recent ON edit_history(tenant_id, edited_at DESC);
ALTER TABLE edit_history ENABLE ROW LEVEL SECURITY;
