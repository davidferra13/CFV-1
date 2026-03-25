-- Partner Portal Auth
-- Enables authenticated login for referral partners (Airbnb hosts, venue owners, etc.)
-- who have no financial relationship with ChefFlow — exposure IS the value for them.
--
-- KEY INSIGHT: Almost every partner in the system originated through a client:
--   Client books vacation rental → Chef does amazing work → Client tells host →
--   Host adds chef to their welcome binder → Host becomes a formal partner.
-- This migration captures that origin story with origin_client_id + origin_event_id.
--
-- Safe to apply on top of existing referral_partners schema (all additive).
-- No data is altered or dropped.
--
-- Prerequisite: 20260221000014_referral_partners.sql must be applied first.

-- ─── Step 1: Add 'partner' to the user_role enum ─────────────────────────────
-- This cannot run inside a transaction block in older Postgres versions,
-- but Postgres 15+ (used by Supabase) supports it.
-- IF NOT EXISTS prevents double-application errors.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'partner';

-- ─── Step 2: Auth + invite columns on referral_partners ──────────────────────
ALTER TABLE referral_partners
  -- Auth linkage: NULL until the partner claims their invite
  ADD COLUMN IF NOT EXISTS auth_user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Invite flow: chef generates a one-time token; partner opens the link to sign up
  ADD COLUMN IF NOT EXISTS invite_token      UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invite_sent_at    TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS claimed_at        TIMESTAMPTZ DEFAULT NULL,
  -- Organic acquisition tracking: captures the client→event→partner origin story
  ADD COLUMN IF NOT EXISTS origin_client_id  UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_event_id   UUID REFERENCES events(id) ON DELETE SET NULL,
  -- How this partner was acquired: 'client_event_referral' | 'direct_outreach' | 'organic'
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT DEFAULT 'organic';

-- ─── Step 3: Indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_referral_partners_auth_user
  ON referral_partners(auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_partners_invite_token
  ON referral_partners(invite_token) WHERE invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_partners_origin_client
  ON referral_partners(origin_client_id) WHERE origin_client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_partners_origin_event
  ON referral_partners(origin_event_id) WHERE origin_event_id IS NOT NULL;

-- ─── Step 4: RLS for partner-role users on referral_partners ─────────────────
-- Existing chef policies remain intact. PostgreSQL ORs permissive SELECT policies,
-- so partners see ONLY their own record; chefs see all records in their tenant.

DROP POLICY IF EXISTS "partner_view_own" ON referral_partners;
CREATE POLICY "partner_view_own"
  ON referral_partners FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "partner_update_own" ON referral_partners;
CREATE POLICY "partner_update_own"
  ON referral_partners FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ─── Step 5: RLS for partner-role users on partner_locations ─────────────────
DROP POLICY IF EXISTS "partner_view_own_locations" ON partner_locations;
CREATE POLICY "partner_view_own_locations"
  ON partner_locations FOR SELECT TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM referral_partners WHERE auth_user_id = auth.uid()
    )
  );

-- ─── Step 6: RLS for partner-role users on partner_images ────────────────────
DROP POLICY IF EXISTS "partner_view_own_images" ON partner_images;
CREATE POLICY "partner_view_own_images"
  ON partner_images FOR SELECT TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM referral_partners WHERE auth_user_id = auth.uid()
    )
  );

COMMENT ON COLUMN referral_partners.auth_user_id IS 'Supabase auth user ID — set when partner claims their invite';
COMMENT ON COLUMN referral_partners.invite_token IS 'One-time UUID token for the partner signup link; cleared after claim';
COMMENT ON COLUMN referral_partners.claimed_at IS 'Timestamp when the partner signed up and linked their account';
COMMENT ON COLUMN referral_partners.origin_client_id IS 'The client whose booking first connected this host to the chef';
COMMENT ON COLUMN referral_partners.origin_event_id IS 'The specific event that led to this host becoming a partner';
COMMENT ON COLUMN referral_partners.acquisition_source IS 'How the partnership was established: client_event_referral | direct_outreach | organic';
