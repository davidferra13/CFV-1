-- Cannabis Client Portal Access Layer
-- Adds persistent age permission tracking and extends tier status for client portal gating.
-- Access requires BOTH: admin-issued cannabis tier (active) AND approved age permission.

-- ============================================================================
-- 1) Extend cannabis_tier_users status to support full lifecycle
-- ============================================================================
ALTER TABLE cannabis_tier_users
  DROP CONSTRAINT IF EXISTS cannabis_tier_users_status_check;

ALTER TABLE cannabis_tier_users
  ADD CONSTRAINT cannabis_tier_users_status_check
  CHECK (status IN ('active', 'suspended', 'revoked', 'blocked', 'pending'));

ALTER TABLE cannabis_tier_users
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by TEXT,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'full'
    CHECK (scope IN ('full', 'view_only', 'request_only'));

-- ============================================================================
-- 2) Cannabis Age Permissions (persistent, per-user, admin-managed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cannabis_age_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_submitted'
    CHECK (status IN (
      'not_submitted', 'pending', 'approved', 'rejected',
      'expired', 'manually_verified', 'self_attested', 'blocked'
    )),
  verification_method TEXT
    CHECK (verification_method IS NULL OR verification_method IN (
      'admin_manual', 'self_attestation', 'document_upload', 'in_person'
    )),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auth_user_id)
);

ALTER TABLE cannabis_age_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cannabis_age_permissions_read_own" ON cannabis_age_permissions;
CREATE POLICY "cannabis_age_permissions_read_own"
  ON cannabis_age_permissions FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_cannabis_age_permissions_user
  ON cannabis_age_permissions(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_cannabis_age_permissions_status
  ON cannabis_age_permissions(status);

DROP TRIGGER IF EXISTS set_cannabis_age_permissions_updated_at ON cannabis_age_permissions;
CREATE TRIGGER set_cannabis_age_permissions_updated_at
  BEFORE UPDATE ON cannabis_age_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3) Cannabis Client Requests (client-initiated dinner requests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cannabis_dinner_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'approved', 'declined', 'converted')),
  preferred_date DATE,
  guest_count INTEGER CHECK (guest_count IS NULL OR guest_count > 0),
  location_notes TEXT,
  format_preference TEXT,
  menu_preferences TEXT,
  cannabis_experience_goal TEXT,
  desired_intensity TEXT
    CHECK (desired_intensity IS NULL OR desired_intensity IN (
      'micro', 'light', 'moderate', 'full', 'custom'
    )),
  guest_onboarding_needed BOOLEAN DEFAULT true,
  notes TEXT,
  prior_event_reference UUID REFERENCES events(id) ON DELETE SET NULL,
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  converted_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cannabis_dinner_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cannabis_dinner_requests_read_own" ON cannabis_dinner_requests;
CREATE POLICY "cannabis_dinner_requests_read_own"
  ON cannabis_dinner_requests FOR SELECT
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "cannabis_dinner_requests_insert_own" ON cannabis_dinner_requests;
CREATE POLICY "cannabis_dinner_requests_insert_own"
  ON cannabis_dinner_requests FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "cannabis_dinner_requests_chef_all" ON cannabis_dinner_requests;
CREATE POLICY "cannabis_dinner_requests_chef_all"
  ON cannabis_dinner_requests FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

CREATE INDEX IF NOT EXISTS idx_cannabis_dinner_requests_client
  ON cannabis_dinner_requests(client_id);

CREATE INDEX IF NOT EXISTS idx_cannabis_dinner_requests_tenant
  ON cannabis_dinner_requests(tenant_id, status);

DROP TRIGGER IF EXISTS set_cannabis_dinner_requests_updated_at ON cannabis_dinner_requests;
CREATE TRIGGER set_cannabis_dinner_requests_updated_at
  BEFORE UPDATE ON cannabis_dinner_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4) Cannabis audit extension for age permission events
-- ============================================================================
-- (Uses existing admin_audit_log table; action types added at app layer)
