-- Cannabis Dinner Guest RSVP Extension
-- Adds token-scoped guest event profile data for cannabis-enabled RSVP flows.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guest_attending_status') THEN
    CREATE TYPE guest_attending_status AS ENUM ('yes', 'no');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guest_cannabis_participation') THEN
    CREATE TYPE guest_cannabis_participation AS ENUM ('participate', 'not_consume', 'undecided');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guest_familiarity_level') THEN
    CREATE TYPE guest_familiarity_level AS ENUM ('new', 'light', 'moderate', 'experienced');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guest_consumption_style') THEN
    CREATE TYPE guest_consumption_style AS ENUM (
      'edibles',
      'infused_course',
      'paired_noninfused',
      'skip_infusion',
      'unsure'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guest_edible_familiarity') THEN
    CREATE TYPE guest_edible_familiarity AS ENUM ('none', 'low', 'moderate', 'high');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS guest_event_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_token TEXT NOT NULL UNIQUE,
  attending_status guest_attending_status NOT NULL DEFAULT 'yes',
  dietary_notes TEXT,
  accessibility_notes TEXT,
  cannabis_participation guest_cannabis_participation NOT NULL DEFAULT 'undecided',
  familiarity_level guest_familiarity_level,
  consumption_style guest_consumption_style[] DEFAULT '{}',
  edible_familiarity guest_edible_familiarity,
  preferred_dose_note TEXT,
  comfort_notes TEXT,
  discuss_in_person_flag BOOLEAN NOT NULL DEFAULT false,
  age_confirmed BOOLEAN NOT NULL DEFAULT false,
  final_confirmation BOOLEAN NOT NULL DEFAULT false,
  voluntary_acknowledgment BOOLEAN NOT NULL DEFAULT false,
  alcohol_acknowledgment BOOLEAN NOT NULL DEFAULT false,
  transportation_acknowledgment BOOLEAN NOT NULL DEFAULT false,
  menu_preference_note TEXT,
  additional_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guest_event_profile_event_token_unique UNIQUE (event_id, guest_token)
);

CREATE INDEX IF NOT EXISTS idx_guest_event_profile_guest_token ON guest_event_profile(guest_token);
CREATE INDEX IF NOT EXISTS idx_guest_event_profile_event_id ON guest_event_profile(event_id);

DROP TRIGGER IF EXISTS set_guest_event_profile_updated_at ON guest_event_profile;
CREATE TRIGGER set_guest_event_profile_updated_at
  BEFORE UPDATE ON guest_event_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE guest_event_profile ENABLE ROW LEVEL SECURITY;

-- Chef visibility for events they own.
DROP POLICY IF EXISTS guest_event_profile_chef_all ON guest_event_profile;
CREATE POLICY guest_event_profile_chef_all ON guest_event_profile
  FOR ALL
  USING (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN user_roles ur ON ur.auth_user_id = auth.uid() AND ur.role = 'chef'
      WHERE e.tenant_id = ur.entity_id
    )
  );

-- Public guest access is token-based at the app layer.
-- App layer MUST always filter by exact guest_token + event_id.
DROP POLICY IF EXISTS guest_event_profile_public_select ON guest_event_profile;
CREATE POLICY guest_event_profile_public_select ON guest_event_profile
  FOR SELECT USING (true);

DROP POLICY IF EXISTS guest_event_profile_public_insert ON guest_event_profile;
CREATE POLICY guest_event_profile_public_insert ON guest_event_profile
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS guest_event_profile_public_update ON guest_event_profile;
CREATE POLICY guest_event_profile_public_update ON guest_event_profile
  FOR UPDATE USING (true);

GRANT SELECT, INSERT, UPDATE ON guest_event_profile TO anon;
