-- Portfolio Permission Management: enforce photo permissions across all surfaces
-- Note: photo_permission already added to clients table in migration 20260322000006
-- This migration adds the portfolio-level audit and removal request infrastructure

CREATE TABLE IF NOT EXISTS chef_portfolio_removal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  request_date DATE DEFAULT CURRENT_DATE,
  reason TEXT,
  tasks JSONB DEFAULT '[]',
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','completed')),
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chef_portfolio_removal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_removal_own_tenant" ON chef_portfolio_removal_requests
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_portfolio_removal_tenant ON chef_portfolio_removal_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_removal_client ON chef_portfolio_removal_requests(client_id) WHERE client_id IS NOT NULL;
