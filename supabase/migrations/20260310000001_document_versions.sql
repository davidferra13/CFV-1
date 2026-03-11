-- Document version history for menus, quotes, and recipes
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('menu', 'quote', 'recipe')),
  entity_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL, -- full entity snapshot
  change_summary TEXT, -- human-readable description of change
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doc_versions_entity ON document_versions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_tenant ON document_versions(tenant_id);
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chef owns document versions" ON document_versions
  FOR ALL USING (tenant_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
