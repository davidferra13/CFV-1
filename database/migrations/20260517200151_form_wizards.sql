CREATE TABLE IF NOT EXISTS wizard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  wizard_id TEXT NOT NULL,
  name TEXT NOT NULL,
  steps JSONB DEFAULT '[]',
  current_step INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_wizard_configs_unique ON wizard_configs(tenant_id, wizard_id);

CREATE TABLE IF NOT EXISTS intake_form_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  fields JSONB DEFAULT '[]',
  success_message TEXT,
  redirect_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  form_id UUID NOT NULL,
  data JSONB NOT NULL,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
);
