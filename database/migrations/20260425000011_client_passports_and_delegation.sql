-- Client Passport: portable preference profile for repeat clients
-- Delegation: on_behalf_of attribution for assistant-operated circles

-- 1. Client Passports table
CREATE TABLE IF NOT EXISTS client_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  -- Service preferences
  default_guest_count INT DEFAULT NULL,
  budget_range_min_cents INT DEFAULT NULL,
  budget_range_max_cents INT DEFAULT NULL,
  service_style TEXT DEFAULT NULL
    CHECK (service_style IS NULL OR service_style IN (
      'formal_plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'no_preference'
    )),

  -- Communication preferences
  communication_mode TEXT NOT NULL DEFAULT 'direct'
    CHECK (communication_mode IN ('direct', 'delegate_only', 'delegate_preferred')),
  preferred_contact_method TEXT DEFAULT NULL
    CHECK (preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'sms', 'phone', 'circle')),
  max_interaction_rounds INT DEFAULT 1,

  -- Autonomy preferences (how much should the chef decide alone)
  chef_autonomy_level TEXT NOT NULL DEFAULT 'full'
    CHECK (chef_autonomy_level IN ('full', 'high', 'moderate', 'low')),
  auto_approve_under_cents INT DEFAULT NULL,

  -- Standing instructions (free text the chef always sees)
  standing_instructions TEXT DEFAULT NULL,

  -- Location defaults
  default_locations JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_client_passports_profile UNIQUE (profile_id)
);

CREATE INDEX idx_client_passports_profile ON client_passports(profile_id);

COMMENT ON TABLE client_passports IS 'Portable client preference profile. One per guest profile. Travels across chefs and circles.';
COMMENT ON COLUMN client_passports.communication_mode IS 'direct = client handles comms, delegate_only = only assistant responds, delegate_preferred = assistant preferred but client may respond';
COMMENT ON COLUMN client_passports.chef_autonomy_level IS 'full = chef decides everything, high = chef decides most things, moderate = chef proposes + client approves, low = client directs';
COMMENT ON COLUMN client_passports.auto_approve_under_cents IS 'If set, proposals under this amount can be auto-approved without explicit client action';
COMMENT ON COLUMN client_passports.default_locations IS 'JSON array of {label, address, city, state} objects for common event locations';
COMMENT ON COLUMN client_passports.standing_instructions IS 'Free text instructions the chef always sees (e.g. "No seafood ever", "Always include a cheese course")';

-- 2. Delegation column on hub_group_members
ALTER TABLE hub_group_members
  ADD COLUMN IF NOT EXISTS on_behalf_of_profile_id UUID DEFAULT NULL
    REFERENCES hub_guest_profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN hub_group_members.on_behalf_of_profile_id IS 'If set, this member operates as a delegate for another profile (e.g. assistant acting for client)';

-- 3. Updated_at trigger for passports
CREATE OR REPLACE FUNCTION update_client_passports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_client_passports_updated_at
  BEFORE UPDATE ON client_passports
  FOR EACH ROW
  EXECUTE FUNCTION update_client_passports_updated_at();
