-- Layer 5b: Chef Documents
-- Stores imported documents, contracts, templates, and other text records

-- chef_documents table
CREATE TABLE chef_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  title TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'general'
    CHECK (document_type IN ('contract', 'template', 'policy', 'checklist', 'note', 'general')),
  content_text TEXT,
  summary TEXT,
  key_terms JSONB DEFAULT '[]'::jsonb,
  source_type TEXT NOT NULL DEFAULT 'text_import'
    CHECK (source_type IN ('text_import', 'file_upload', 'manual')),
  source_filename TEXT,
  tags TEXT[] DEFAULT '{}',
  event_id UUID REFERENCES events(id),
  client_id UUID REFERENCES clients(id),
  is_template BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
-- RLS
ALTER TABLE chef_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY chef_documents_tenant_isolation ON chef_documents
  FOR ALL
  USING (tenant_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'))
  WITH CHECK (tenant_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'));
-- Indexes
CREATE INDEX idx_chef_documents_tenant ON chef_documents(tenant_id);
CREATE INDEX idx_chef_documents_type ON chef_documents(tenant_id, document_type);
-- Updated_at trigger
CREATE TRIGGER chef_documents_updated_at
  BEFORE UPDATE ON chef_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
