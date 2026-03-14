-- Professional Momentum Snapshots: computed cache of chef growth trajectory signals
CREATE TABLE IF NOT EXISTS chef_momentum_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  new_dishes_90d INT DEFAULT 0,
  new_cuisines_90d INT DEFAULT 0,
  new_clients_90d INT DEFAULT 0,
  education_entries_12m INT DEFAULT 0,
  creative_projects_90d INT DEFAULT 0,
  avg_satisfaction_90d NUMERIC(3,1),
  lost_quotes_90d INT DEFAULT 0,
  momentum_direction TEXT CHECK (momentum_direction IN ('growing','maintaining','stagnating')),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, snapshot_date)
);
-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE chef_momentum_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_momentum_snapshots' AND column_name = 'chef_id') THEN
    UPDATE chef_momentum_snapshots SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;
-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE chef_momentum_snapshots ADD COLUMN IF NOT EXISTS snapshot_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE chef_momentum_snapshots ADD COLUMN IF NOT EXISTS new_dishes_90d INT DEFAULT 0;
ALTER TABLE chef_momentum_snapshots ADD COLUMN IF NOT EXISTS new_cuisines_90d INT DEFAULT 0;
ALTER TABLE chef_momentum_snapshots ADD COLUMN IF NOT EXISTS new_clients_90d INT DEFAULT 0;
ALTER TABLE chef_momentum_snapshots ADD COLUMN IF NOT EXISTS education_entries_12m INT DEFAULT 0;
ALTER TABLE chef_momentum_snapshots ADD COLUMN IF NOT EXISTS creative_projects_90d INT DEFAULT 0;
ALTER TABLE chef_momentum_snapshots ADD COLUMN IF NOT EXISTS avg_satisfaction_90d NUMERIC(3,1);
ALTER TABLE chef_momentum_snapshots ADD COLUMN IF NOT EXISTS lost_quotes_90d INT DEFAULT 0;
ALTER TABLE chef_momentum_snapshots ADD COLUMN IF NOT EXISTS momentum_direction TEXT;
ALTER TABLE chef_momentum_snapshots ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_momentum_snapshots ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "chef_momentum_own_tenant" ON chef_momentum_snapshots;
CREATE POLICY "chef_momentum_own_tenant" ON chef_momentum_snapshots
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
-- Enable pgcrypto for gen_random_bytes if not already enabled
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;
-- Availability share tokens for shareable schedule view
CREATE TABLE IF NOT EXISTS chef_availability_share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE chef_availability_share_tokens ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_availability_share_tokens' AND column_name = 'chef_id') THEN
    UPDATE chef_availability_share_tokens SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;
-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE chef_availability_share_tokens ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE chef_availability_share_tokens ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE chef_availability_share_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE chef_availability_share_tokens ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_availability_share_tokens ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "availability_share_own_tenant" ON chef_availability_share_tokens;
CREATE POLICY "availability_share_own_tenant" ON chef_availability_share_tokens
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS idx_momentum_tenant ON chef_momentum_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_token ON chef_availability_share_tokens(token);
