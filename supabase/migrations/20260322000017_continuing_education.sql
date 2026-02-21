-- Continuing Education Log: track professional learning activities
CREATE TABLE IF NOT EXISTS chef_education_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'online_course','book','stage','travel','conference',
    'workshop','mentorship','experimentation','other'
  )),
  title TEXT NOT NULL,
  description TEXT,
  learned TEXT,
  how_changed_cooking TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chef_education_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_education_own_tenant" ON chef_education_log
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_education_tenant ON chef_education_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_education_date ON chef_education_log(tenant_id, entry_date);
