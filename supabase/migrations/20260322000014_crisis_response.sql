-- Crisis Response Protocol: activated crisis plans with step-by-step playbooks
CREATE TABLE IF NOT EXISTS chef_crisis_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL CHECK (scenario IN (
    'food_safety_incident','viral_negative_post','false_review_campaign',
    'client_dispute_public','social_media_hacked','other'
  )),
  checklist_progress JSONB DEFAULT '{}',
  activated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chef_crisis_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_crisis_own_tenant" ON chef_crisis_plans
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_crisis_plans_tenant ON chef_crisis_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crisis_active ON chef_crisis_plans(tenant_id, activated_at) WHERE resolved_at IS NULL;
