-- Charity Hours Logging
-- Allows chefs to track volunteer/charity hours at organizations.
-- Organization data comes from Google Places autocomplete + optional ProPublica 501(c) verification.
-- Free tier — part of core chef identity.

-- ============================================
-- TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS charity_hours (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Organization info (from Google Places + optional ProPublica enrichment)
  organization_name     TEXT NOT NULL,
  organization_address  TEXT,
  google_place_id       TEXT,
  ein                   TEXT,
  is_verified_501c      BOOLEAN NOT NULL DEFAULT false,

  -- Hour log details
  service_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  hours                 NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE charity_hours IS 'Tracks volunteer/charity hours logged by chefs at various organizations.';
COMMENT ON COLUMN charity_hours.ein IS 'IRS Employer Identification Number from ProPublica Nonprofit Explorer. NULL if not verified.';
COMMENT ON COLUMN charity_hours.is_verified_501c IS 'True if the organization was found in ProPublica IRS database as a 501(c) nonprofit.';
COMMENT ON COLUMN charity_hours.hours IS 'Decimal hours worked (e.g. 2.5 for two and a half hours). Max 24 per entry.';

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_charity_hours_chef_date
  ON charity_hours(chef_id, service_date DESC);

CREATE INDEX IF NOT EXISTS idx_charity_hours_chef_org
  ON charity_hours(chef_id, organization_name);

CREATE INDEX IF NOT EXISTS idx_charity_hours_place_id
  ON charity_hours(google_place_id)
  WHERE google_place_id IS NOT NULL;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER set_charity_hours_updated_at
  BEFORE UPDATE ON charity_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE charity_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY ch_chef_select ON charity_hours
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

CREATE POLICY ch_chef_insert ON charity_hours
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

CREATE POLICY ch_chef_update ON charity_hours
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

CREATE POLICY ch_chef_delete ON charity_hours
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
