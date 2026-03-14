-- Client Segments: chef-defined custom client groups
CREATE TABLE IF NOT EXISTS client_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '[]', -- array of {field, op, value}
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_segments_tenant ON client_segments(tenant_id);

ALTER TABLE client_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef owns segments" ON client_segments
  FOR ALL USING (tenant_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
