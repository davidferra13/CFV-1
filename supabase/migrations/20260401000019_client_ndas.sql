-- Client NDA Management: track NDAs for HNW/celebrity clients
-- Supports standard, mutual, and custom NDA types with status lifecycle

CREATE TABLE IF NOT EXISTS client_ndas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nda_type TEXT NOT NULL CHECK (nda_type IN ('standard', 'mutual', 'custom')),
  signed_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'expired', 'voided')),
  notes TEXT,
  document_url TEXT,
  restrictions TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for tenant + client lookups
CREATE INDEX IF NOT EXISTS idx_client_ndas_tenant_client
  ON client_ndas (tenant_id, client_id);

-- Index for expiry date queries (dashboard alerts)
CREATE INDEX IF NOT EXISTS idx_client_ndas_expiry
  ON client_ndas (tenant_id, expiry_date)
  WHERE status = 'signed';

-- RLS
ALTER TABLE client_ndas ENABLE ROW LEVEL SECURITY;

-- Chef can read/write their own NDAs
CREATE POLICY client_ndas_chef_all ON client_ndas
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
