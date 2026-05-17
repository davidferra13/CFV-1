CREATE TABLE IF NOT EXISTS revision_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by UUID NOT NULL,
  changed_by_name TEXT,
  change_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_revision_entries_entity ON revision_entries(tenant_id, entity_type, entity_id, version DESC);
