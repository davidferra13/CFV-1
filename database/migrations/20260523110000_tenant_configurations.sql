-- Configuration Engine: tenant workspace configuration
-- Stores onboarding questionnaire responses and derived workspace config per tenant.

CREATE TABLE IF NOT EXISTS tenant_configurations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL UNIQUE REFERENCES chefs(id) ON DELETE CASCADE,
  question_responses jsonb DEFAULT '[]'::jsonb,
  applied_config     jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_configurations_tenant
  ON tenant_configurations (tenant_id);

-- RLS: chef can only access own configuration
ALTER TABLE tenant_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_config_chef_all ON tenant_configurations
  FOR ALL
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
