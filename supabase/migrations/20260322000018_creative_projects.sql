-- Creative Project Space ("My Kitchen"): personal cooking experiments not tied to clients
CREATE TABLE IF NOT EXISTS chef_creative_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  cuisine TEXT,
  notes TEXT,
  status TEXT DEFAULT 'experimenting' CHECK (status IN (
    'experimenting','nearly_there','mastered','abandoned'
  )),
  photos TEXT[] DEFAULT '{}',
  entry_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chef_creative_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_creative_own_tenant" ON chef_creative_projects
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_creative_tenant ON chef_creative_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_creative_date ON chef_creative_projects(tenant_id, entry_date);
