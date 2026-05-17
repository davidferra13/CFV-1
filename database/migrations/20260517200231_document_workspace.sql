-- Document Workspace (UI SYSTEM #47)

CREATE TABLE IF NOT EXISTS proof_pack_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID,
  document_type TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  file_path TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proof_pack_documents_tenant_event
  ON proof_pack_documents (tenant_id, event_id);

CREATE TABLE IF NOT EXISTS proof_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID,
  title TEXT NOT NULL,
  document_ids JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'assembling',
  sent_to TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proof_packs_tenant_event
  ON proof_packs (tenant_id, event_id);

CREATE TABLE IF NOT EXISTS document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  document_id UUID NOT NULL,
  approver_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  comments TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_approvals_tenant_document
  ON document_approvals (tenant_id, document_id);
