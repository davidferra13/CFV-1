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

ALTER TABLE chef_momentum_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_momentum_own_tenant" ON chef_momentum_snapshots
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

-- Availability share tokens for shareable schedule view
CREATE TABLE IF NOT EXISTS chef_availability_share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chef_availability_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_share_own_tenant" ON chef_availability_share_tokens
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_momentum_tenant ON chef_momentum_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_token ON chef_availability_share_tokens(token);
