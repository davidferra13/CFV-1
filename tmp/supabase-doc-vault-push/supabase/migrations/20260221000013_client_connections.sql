-- Migration: Client Connections
-- Replaces the heavyweight Households feature with lightweight peer-to-peer
-- connections between clients. Flexible relationship types (freeform text),
-- bidirectional lookups, chef-only visibility.
--
-- The existing households / household_members tables are NOT dropped.
-- They remain in the schema but are no longer referenced by the UI.

-- ============================================
-- CLIENT CONNECTIONS TABLE
-- ============================================

CREATE TABLE client_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_a_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_b_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,          -- freeform: 'spouse', 'friend', 'family', 'acquaintance', 'colleague', etc.
  notes TEXT,                               -- optional context about the connection
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- No self-connections
  CONSTRAINT chk_no_self_connection CHECK (client_a_id <> client_b_id),

  -- One connection per ordered pair per tenant
  CONSTRAINT uq_client_connection UNIQUE (tenant_id, client_a_id, client_b_id)
);
-- Indexes for bidirectional lookups
CREATE INDEX idx_client_connections_tenant ON client_connections(tenant_id);
CREATE INDEX idx_client_connections_a ON client_connections(tenant_id, client_a_id);
CREATE INDEX idx_client_connections_b ON client_connections(tenant_id, client_b_id);
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE client_connections ENABLE ROW LEVEL SECURITY;
-- Chefs can see connections for their own tenancy
CREATE POLICY client_connections_select ON client_connections
  FOR SELECT USING (
    tenant_id IN (
      SELECT ur.entity_id FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef'
    )
  );
-- Chefs can create connections within their tenancy
CREATE POLICY client_connections_insert ON client_connections
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT ur.entity_id FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef'
    )
  );
-- Chefs can update connections within their tenancy
CREATE POLICY client_connections_update ON client_connections
  FOR UPDATE USING (
    tenant_id IN (
      SELECT ur.entity_id FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef'
    )
  );
-- Chefs can delete connections within their tenancy
CREATE POLICY client_connections_delete ON client_connections
  FOR DELETE USING (
    tenant_id IN (
      SELECT ur.entity_id FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef'
    )
  );
