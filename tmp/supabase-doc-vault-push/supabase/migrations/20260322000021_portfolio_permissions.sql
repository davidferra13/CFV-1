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
-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE chef_portfolio_removal_requests ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_portfolio_removal_requests' AND column_name = 'chef_id') THEN
    UPDATE chef_portfolio_removal_requests SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;
-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE chef_portfolio_removal_requests ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE chef_portfolio_removal_requests ADD COLUMN IF NOT EXISTS request_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE chef_portfolio_removal_requests ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE chef_portfolio_removal_requests ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]';
ALTER TABLE chef_portfolio_removal_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE chef_portfolio_removal_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE chef_portfolio_removal_requests ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE chef_portfolio_removal_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_portfolio_removal_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_portfolio_removal_requests ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "portfolio_removal_own_tenant" ON chef_portfolio_removal_requests;
CREATE POLICY "portfolio_removal_own_tenant" ON chef_portfolio_removal_requests
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS idx_portfolio_removal_tenant ON chef_portfolio_removal_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_removal_client ON chef_portfolio_removal_requests(client_id) WHERE client_id IS NOT NULL;
