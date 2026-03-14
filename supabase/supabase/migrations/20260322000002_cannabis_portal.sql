-- Cannabis Portal Schema
-- Invitation-only, admin-gated tier for cannabis dining events.
-- All access is controlled by admin. No user can self-grant.

-- ─── 1. Cannabis Tier Users ──────────────────────────────────────────────────
-- Tracks which platform users have been granted cannabis tier access.
-- Only the admin can insert/update rows (via service role in cannabis-actions.ts).
-- Users can read their own row to determine if they have access.

CREATE TABLE cannabis_tier_users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type             TEXT NOT NULL CHECK (user_type IN ('chef', 'client', 'partner')),
  entity_id             UUID NOT NULL,       -- chefs.id / clients.id / referral_partners.id
  tenant_id             UUID REFERENCES chefs(id) ON DELETE SET NULL,
  granted_by_admin_email TEXT NOT NULL,
  granted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  notes                 TEXT,
  UNIQUE(auth_user_id)
);

ALTER TABLE cannabis_tier_users ENABLE ROW LEVEL SECURITY;

-- Users can read their own row (needed for hasCannabisAccess check)
CREATE POLICY "cannabis_tier_users_read_own"
  ON cannabis_tier_users FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE INDEX idx_cannabis_tier_users_auth_user_id ON cannabis_tier_users(auth_user_id);
CREATE INDEX idx_cannabis_tier_users_tenant_id ON cannabis_tier_users(tenant_id);


-- ─── 2. Cannabis Tier Invitations ────────────────────────────────────────────
-- All invites are queued here first. Admin approves or rejects before anything
-- is sent to the invitee. The token is generated ONLY after admin approval.

CREATE TABLE cannabis_tier_invitations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by_auth_user_id   UUID NOT NULL REFERENCES auth.users(id),
  invited_by_user_type      TEXT NOT NULL CHECK (invited_by_user_type IN ('chef', 'client', 'partner', 'admin')),
  invitee_email             TEXT NOT NULL,
  invitee_name              TEXT,
  personal_note             TEXT,               -- Optional message to admin + invitee
  admin_approval_status     TEXT NOT NULL DEFAULT 'pending'
                              CHECK (admin_approval_status IN ('pending', 'approved', 'rejected')),
  approved_by_admin_email   TEXT,
  approved_at               TIMESTAMPTZ,
  rejection_reason          TEXT,
  token                     TEXT UNIQUE,        -- Generated only after admin approval
  sent_at                   TIMESTAMPTZ,        -- When the invite email was sent
  claimed_at                TIMESTAMPTZ,        -- When the invitee accepted
  expires_at                TIMESTAMPTZ,        -- 30-day window from approval
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cannabis_tier_invitations ENABLE ROW LEVEL SECURITY;

-- Inviting user can read invites they sent (to see "pending approval" status)
CREATE POLICY "cannabis_invitations_read_own"
  ON cannabis_tier_invitations FOR SELECT
  USING (invited_by_auth_user_id = auth.uid());

-- Inviting user can insert their own invites
CREATE POLICY "cannabis_invitations_insert_own"
  ON cannabis_tier_invitations FOR INSERT
  WITH CHECK (invited_by_auth_user_id = auth.uid());

CREATE INDEX idx_cannabis_invitations_status ON cannabis_tier_invitations(admin_approval_status);
CREATE INDEX idx_cannabis_invitations_token ON cannabis_tier_invitations(token);
CREATE INDEX idx_cannabis_invitations_inviter ON cannabis_tier_invitations(invited_by_auth_user_id);


-- ─── 3. Cannabis Event Category Enum ─────────────────────────────────────────

CREATE TYPE event_cannabis_category AS ENUM (
  'cannabis_friendly',   -- cannabis welcome but not integral to the menu
  'infused_menu',        -- food/drink actively infused with cannabis
  'cbd_only',            -- CBD products only, no THC
  'micro_dose'           -- micro-dose fine dining experience
);


-- ─── 4. Cannabis Event Details ────────────────────────────────────────────────
-- Extends the events table for cannabis-specific data.
-- Linked 1:1 to an event; event must have cannabis_preference = true.
-- Compliance fields are placeholders — Phase 2 will add structured dosing/SOP data.

CREATE TABLE cannabis_event_details (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                          UUID UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id                         UUID NOT NULL REFERENCES chefs(id),
  cannabis_category                 event_cannabis_category NOT NULL DEFAULT 'cannabis_friendly',
  guest_consent_confirmed           BOOLEAN NOT NULL DEFAULT false,
  compliance_notes                  TEXT,   -- freeform placeholder; structured in Phase 2
  compliance_placeholder_acknowledged BOOLEAN DEFAULT false,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cannabis_event_details ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped: chef can CRUD their own cannabis event details
CREATE POLICY "cannabis_event_details_tenant_access"
  ON cannabis_event_details FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid()
      AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid()
      AND role = 'chef'
    )
  );

CREATE INDEX idx_cannabis_event_details_event_id ON cannabis_event_details(event_id);
CREATE INDEX idx_cannabis_event_details_tenant_id ON cannabis_event_details(tenant_id);
