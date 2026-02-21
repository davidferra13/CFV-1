-- Quarterly Growth Check-Ins: structured chef reflection on growth and satisfaction
CREATE TABLE IF NOT EXISTS chef_growth_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  satisfaction_score INT CHECK (satisfaction_score BETWEEN 1 AND 10),
  learned_this_quarter TEXT,
  draining_this_quarter TEXT,
  goal_next_quarter TEXT,
  track_request TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, checkin_date)
);

ALTER TABLE chef_growth_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_checkins_own_tenant" ON chef_growth_checkins
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_growth_checkins_tenant ON chef_growth_checkins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_growth_checkins_date ON chef_growth_checkins(tenant_id, checkin_date);
