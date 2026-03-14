-- Beta Onboarding System
-- Adds beta tester tracking, onboarding checklist state, beta discounts,
-- and referral tracking for the client beta program.
--
-- Key concepts:
--   - Clients can be flagged as beta testers (is_beta_tester on clients table)
--   - Beta discount (30%) auto-applies to invoices for flagged clients
--   - Onboarding checklist tracks progress through key platform features
--   - Referral source tracks how guests discovered the platform (which circle introduced them)
--   - Guest profiles already exist (hub_guest_profiles) - this migration adds
--     onboarding-specific fields

-- ============================================================
-- 1. Beta tester flag + discount on clients table
-- ============================================================
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS beta_enrolled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS beta_discount_percent INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS referred_by_client_id UUID REFERENCES clients(id),
  ADD COLUMN IF NOT EXISTS referred_from_group_id UUID REFERENCES hub_groups(id);
COMMENT ON COLUMN clients.is_beta_tester IS
  'When true, beta discount auto-applies to all invoices. Set by admin.';
COMMENT ON COLUMN clients.beta_discount_percent IS
  'Beta tester discount percentage (default 30). Configurable per client.';
COMMENT ON COLUMN clients.referred_by_client_id IS
  'The client who introduced this person to the platform (referral tracking).';
COMMENT ON COLUMN clients.referred_from_group_id IS
  'The hub group/circle that introduced this person to the platform.';
-- ============================================================
-- 2. Beta onboarding checklist tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS beta_onboarding_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Step completion timestamps (null = not completed)
  taste_profile_completed_at TIMESTAMPTZ,
  circle_created_at TIMESTAMPTZ,
  circle_members_invited_at TIMESTAMPTZ,
  first_event_booked_at TIMESTAMPTZ,
  post_event_review_at TIMESTAMPTZ,

  -- Which circle they created (for tracking)
  primary_circle_id UUID REFERENCES hub_groups(id),

  -- Overall
  all_steps_completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ, -- if they dismiss the checklist

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, client_id)
);
COMMENT ON TABLE beta_onboarding_checklist IS
  'Tracks each beta tester client progress through the onboarding checklist. One row per client per tenant.';
-- ============================================================
-- 3. Referral tracking on hub_guest_profiles
-- ============================================================
ALTER TABLE hub_guest_profiles
  ADD COLUMN IF NOT EXISTS referred_by_profile_id UUID REFERENCES hub_guest_profiles(id),
  ADD COLUMN IF NOT EXISTS first_group_id UUID REFERENCES hub_groups(id),
  ADD COLUMN IF NOT EXISTS upgraded_to_client_at TIMESTAMPTZ;
COMMENT ON COLUMN hub_guest_profiles.referred_by_profile_id IS
  'The profile that invited this guest to their first circle.';
COMMENT ON COLUMN hub_guest_profiles.first_group_id IS
  'The first group this guest joined (for referral attribution).';
COMMENT ON COLUMN hub_guest_profiles.upgraded_to_client_at IS
  'When this guest profile upgraded to a full client account.';
-- ============================================================
-- 4. Beta discount ledger entry type
-- ============================================================
-- We track beta discounts as a ledger adjustment (like loyalty discounts)
-- so they show up on invoices and financial reports correctly.

-- Add beta_discount_applied flag to events for quick lookup
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS beta_discount_percent INTEGER,
  ADD COLUMN IF NOT EXISTS beta_discount_cents INTEGER;
COMMENT ON COLUMN events.beta_discount_percent IS
  'Beta discount percentage applied to this event (null = no beta discount).';
COMMENT ON COLUMN events.beta_discount_cents IS
  'Computed beta discount amount in cents for this event.';
-- ============================================================
-- 5. RLS policies
-- ============================================================

-- Beta onboarding checklist: clients can read their own, chefs can read all for their tenant
ALTER TABLE beta_onboarding_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY beta_checklist_client_read ON beta_onboarding_checklist
  FOR SELECT USING (
    client_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'client'
    )
  );
CREATE POLICY beta_checklist_chef_all ON beta_onboarding_checklist
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- ============================================================
-- 6. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_beta_tester
  ON clients(tenant_id) WHERE is_beta_tester = TRUE;
CREATE INDEX IF NOT EXISTS idx_beta_checklist_tenant
  ON beta_onboarding_checklist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_beta_checklist_client
  ON beta_onboarding_checklist(client_id);
CREATE INDEX IF NOT EXISTS idx_hub_profiles_first_group
  ON hub_guest_profiles(first_group_id) WHERE first_group_id IS NOT NULL;
