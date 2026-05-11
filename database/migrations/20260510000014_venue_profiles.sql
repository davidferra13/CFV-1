-- Venue Profiles
-- Stores kitchen equipment details for venues the chef has visited or will visit.
-- Purely additive. No existing tables modified.
--
-- Powers the venue risk dimension in the operational risk engine.
-- Keyed by (tenant_id, venue_name) to match the existing events.venue_name column.
-- Chef fills in equipment details from site visits or venue questionnaires.

CREATE TABLE IF NOT EXISTS venue_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,

  -- Kitchen capabilities
  has_full_kitchen BOOLEAN,
  oven_count SMALLINT CHECK (oven_count >= 0),
  burner_count SMALLINT CHECK (burner_count >= 0),
  has_refrigeration BOOLEAN,
  has_freezer BOOLEAN,
  has_running_water BOOLEAN,

  -- Additional context
  notes TEXT,
  last_visited_at DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One profile per venue per tenant
  UNIQUE (tenant_id, venue_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venue_profiles_tenant
  ON venue_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_lookup
  ON venue_profiles(tenant_id, venue_name);

-- RLS: chef can manage their own venue profiles
ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS venue_profiles_chef_all ON venue_profiles;
CREATE POLICY venue_profiles_chef_all
  ON venue_profiles
  FOR ALL TO authenticated
  USING (
    tenant_id = (
      SELECT ur.entity_id
      FROM public.user_roles ur
      WHERE ur.auth_user_id = auth.uid()
        AND ur.role = 'chef'
      LIMIT 1
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT ur.entity_id
      FROM public.user_roles ur
      WHERE ur.auth_user_id = auth.uid()
        AND ur.role = 'chef'
      LIMIT 1
    )
  );
