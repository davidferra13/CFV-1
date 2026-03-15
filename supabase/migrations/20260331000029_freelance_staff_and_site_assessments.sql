-- Freelance Staff Module + Site Visit Assessment Form
-- Feature 1: Adds freelance-specific columns to staff_members
-- Feature 2: Creates event_site_assessments table for venue evaluations

-- ============================================
-- ALTER: Add freelance staff columns to staff_members
-- ============================================

ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS staff_type TEXT NOT NULL DEFAULT 'regular' CHECK (staff_type IN ('regular', 'freelance'));
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS day_rate_cents INTEGER;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS agency_name TEXT;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS payment_terms TEXT CHECK (payment_terms IS NULL OR payment_terms IN ('on_completion', 'net_15', 'net_30'));
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS tax_id_on_file BOOLEAN DEFAULT FALSE;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS contract_notes TEXT;
CREATE INDEX IF NOT EXISTS idx_staff_members_staff_type ON staff_members(chef_id, staff_type);
-- ============================================
-- TABLE: EVENT SITE ASSESSMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS event_site_assessments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  venue_name            TEXT NOT NULL,
  visit_date            DATE,
  visited_by            TEXT,

  -- Kitchen
  kitchen_size          TEXT CHECK (kitchen_size IS NULL OR kitchen_size IN ('small', 'medium', 'large', 'commercial', 'none')),
  has_oven              BOOLEAN NOT NULL DEFAULT false,
  has_stovetop          BOOLEAN NOT NULL DEFAULT false,
  has_refrigeration     BOOLEAN NOT NULL DEFAULT false,
  has_freezer           BOOLEAN NOT NULL DEFAULT false,
  has_dishwasher        BOOLEAN NOT NULL DEFAULT false,
  outlet_count          INTEGER,
  water_access          BOOLEAN NOT NULL DEFAULT true,

  -- Access
  parking_notes         TEXT,
  loading_dock          BOOLEAN NOT NULL DEFAULT false,
  load_in_path_notes    TEXT,
  elevator_access       BOOLEAN NOT NULL DEFAULT false,
  access_start_time     TIME,
  access_end_time       TIME,

  -- Space
  max_capacity          INTEGER,
  outdoor_space         BOOLEAN NOT NULL DEFAULT false,
  weather_exposure      BOOLEAN NOT NULL DEFAULT false,
  restroom_access       BOOLEAN NOT NULL DEFAULT true,
  storage_space_notes   TEXT,
  noise_restrictions    TEXT,

  -- Venue Contact
  venue_contact_name    TEXT,
  venue_contact_phone   TEXT,
  venue_contact_email   TEXT,

  -- Media & Notes
  photos_json           JSONB,
  general_notes         TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_site_assessments_event ON event_site_assessments(event_id);
CREATE INDEX idx_site_assessments_chef ON event_site_assessments(chef_id);
CREATE INDEX idx_site_assessments_venue ON event_site_assessments(chef_id, venue_name);
CREATE TRIGGER trg_site_assessments_updated_at
  BEFORE UPDATE ON event_site_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
COMMENT ON TABLE event_site_assessments IS 'Structured venue evaluation for first-time event locations.';
-- ============================================
-- RLS: event_site_assessments
-- ============================================

ALTER TABLE event_site_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_assessments_chef_all ON event_site_assessments;
CREATE POLICY site_assessments_chef_all ON event_site_assessments
  FOR ALL
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
