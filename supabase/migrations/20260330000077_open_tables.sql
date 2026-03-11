-- =============================================================================
-- Migration: Open Tables - Social Dining Discovery
-- Layer: Hub Extension
-- Purpose: Enable clients to make their dinner circles discoverable to other
--          foodies in their chef's network. Builds on existing hub_groups.
-- =============================================================================
-- Additive only. No destructive operations.

-- 1. Open Tables metadata columns on hub_groups
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS is_open_table BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS display_area TEXT;
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS display_vibe TEXT[];
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS dietary_theme TEXT[];
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS open_seats INTEGER;
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS max_group_size INTEGER;
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ;
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS chef_approval_required BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS consent_status TEXT DEFAULT 'pending'
  CHECK (consent_status IS NULL OR consent_status IN ('pending', 'ready', 'blocked'));
CREATE INDEX IF NOT EXISTS idx_hub_groups_open_table
  ON hub_groups(is_open_table, visibility) WHERE is_open_table = true;
COMMENT ON COLUMN hub_groups.is_open_table IS 'True when this group is used for Open Tables discovery';
COMMENT ON COLUMN hub_groups.display_area IS 'Neighborhood/city shown on discovery card (never exact address)';
COMMENT ON COLUMN hub_groups.consent_status IS 'Unanimous consent: pending/ready/blocked. Discoverable only when ready.';
-- 2. Open Tables onboarding columns on hub_guest_profiles
ALTER TABLE hub_guest_profiles ADD COLUMN IF NOT EXISTS open_tables_intro_seen BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE hub_guest_profiles ADD COLUMN IF NOT EXISTS open_tables_interested BOOLEAN;
ALTER TABLE hub_guest_profiles ADD COLUMN IF NOT EXISTS open_tables_notify BOOLEAN NOT NULL DEFAULT false;
-- 3. Consent tracking table
CREATE TABLE IF NOT EXISTS open_table_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  consented BOOLEAN,
  consented_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  requested_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),
  requested_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(group_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_ot_consents_group ON open_table_consents(group_id);
CREATE INDEX IF NOT EXISTS idx_ot_consents_profile ON open_table_consents(profile_id);
ALTER TABLE open_table_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ot_consents_service_all" ON open_table_consents
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "ot_consents_select_public" ON open_table_consents
  FOR SELECT USING (true);
COMMENT ON TABLE open_table_consents IS 'Unanimous consent for Open Tables. Table cannot go visible until all members consent.';
-- 4. Join request table
CREATE TABLE IF NOT EXISTS open_table_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  requester_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  group_size INTEGER DEFAULT 1 NOT NULL,
  message TEXT,

  dietary_restrictions TEXT[],
  allergies TEXT[],

  status TEXT DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'approved', 'declined', 'withdrawn', 'expired')),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  decline_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ot_requests_group ON open_table_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_ot_requests_status ON open_table_requests(status);
CREATE INDEX IF NOT EXISTS idx_ot_requests_tenant ON open_table_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ot_requests_requester ON open_table_requests(requester_profile_id);
ALTER TABLE open_table_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ot_requests_service_all" ON open_table_requests
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ot_requests_chef_read" ON open_table_requests
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
COMMENT ON TABLE open_table_requests IS 'Join requests for open tables. Chef approves/declines every one.';
-- 5. Auto-create dinner circle column on clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS dinner_circle_group_id UUID REFERENCES hub_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_dinner_circle ON clients(dinner_circle_group_id)
  WHERE dinner_circle_group_id IS NOT NULL;
COMMENT ON COLUMN clients.dinner_circle_group_id IS 'Auto-created hub_group for this client dinner circle (private by default)';
