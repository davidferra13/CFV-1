CREATE TABLE IF NOT EXISTS portal_experience_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  visible_sections JSONB DEFAULT '[]',
  custom_branding JSONB,
  welcome_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS portal_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  client_id UUID NOT NULL,
  section TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS portal_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  client_id UUID NOT NULL,
  rating INTEGER,
  comment TEXT,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
