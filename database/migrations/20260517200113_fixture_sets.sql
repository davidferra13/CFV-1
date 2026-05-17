CREATE TABLE IF NOT EXISTS fixture_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  scenario TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fixture_sets_tenant ON fixture_sets(tenant_id);
ALTER TABLE fixture_sets ENABLE ROW LEVEL SECURITY;
