CREATE TABLE IF NOT EXISTS trust_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  chef_id UUID NOT NULL,
  badges JSONB DEFAULT '[]',
  signals JSONB DEFAULT '[]',
  trust_score INTEGER DEFAULT 0,
  display_config JSONB DEFAULT '{}',
  verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_trust_profiles_chef ON trust_profiles(tenant_id, chef_id);
