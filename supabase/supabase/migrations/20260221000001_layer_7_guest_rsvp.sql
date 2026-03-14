-- Layer 7: Guest RSVP & Event Sharing
-- Enables clients to share event details with guests via tokenized links.
-- Guests can RSVP, provide dietary info, and optionally create accounts.
-- Chefs control per-event visibility settings.
-- All tables are tenant-scoped following existing patterns.

-- ============================================================
-- ENUM: rsvp_status
-- ============================================================
CREATE TYPE rsvp_status AS ENUM ('pending', 'attending', 'declined', 'maybe');

-- ============================================================
-- TABLE: event_shares
-- One record per shareable link for an event.
-- Created by clients, visibility controlled by chefs.
-- ============================================================
CREATE TABLE event_shares (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_by_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token         TEXT UNIQUE NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  expires_at    TIMESTAMPTZ,
  visibility_settings JSONB NOT NULL DEFAULT '{
    "show_date_time": true,
    "show_location": true,
    "show_occasion": true,
    "show_menu": false,
    "show_dietary_info": false,
    "show_special_requests": false,
    "show_guest_list": false,
    "show_chef_name": true
  }'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for event_shares
CREATE INDEX idx_event_shares_token ON event_shares(token);
CREATE INDEX idx_event_shares_event_id ON event_shares(event_id);
CREATE INDEX idx_event_shares_tenant_id ON event_shares(tenant_id);

-- Updated_at trigger
CREATE TRIGGER set_event_shares_updated_at
  BEFORE UPDATE ON event_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: event_guests
-- One record per guest RSVP. Linked to a share + event.
-- Guest can edit their own RSVP via their unique guest_token.
-- ============================================================
CREATE TABLE event_guests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_share_id UUID NOT NULL REFERENCES event_shares(id) ON DELETE CASCADE,
  guest_token   TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  email         TEXT,
  rsvp_status   rsvp_status NOT NULL DEFAULT 'pending',
  dietary_restrictions TEXT[] DEFAULT '{}',
  allergies     TEXT[] DEFAULT '{}',
  notes         TEXT,
  plus_one      BOOLEAN NOT NULL DEFAULT false,
  auth_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate RSVPs per email per share link
CREATE UNIQUE INDEX idx_event_guests_share_email
  ON event_guests(event_share_id, email)
  WHERE email IS NOT NULL;

-- Indexes for event_guests
CREATE INDEX idx_event_guests_guest_token ON event_guests(guest_token);
CREATE INDEX idx_event_guests_event_id ON event_guests(event_id);
CREATE INDEX idx_event_guests_tenant_id ON event_guests(tenant_id);
CREATE INDEX idx_event_guests_event_share_id ON event_guests(event_share_id);

-- Updated_at trigger
CREATE TRIGGER set_event_guests_updated_at
  BEFORE UPDATE ON event_guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VIEW: event_rsvp_summary
-- Aggregated RSVP counts and dietary info per event.
-- ============================================================
CREATE OR REPLACE VIEW event_rsvp_summary AS
SELECT
  eg.event_id,
  eg.tenant_id,
  COUNT(*)::int AS total_guests,
  COUNT(*) FILTER (WHERE eg.rsvp_status = 'attending')::int AS attending_count,
  COUNT(*) FILTER (WHERE eg.rsvp_status = 'declined')::int AS declined_count,
  COUNT(*) FILTER (WHERE eg.rsvp_status = 'maybe')::int AS maybe_count,
  COUNT(*) FILTER (WHERE eg.rsvp_status = 'pending')::int AS pending_count,
  COUNT(*) FILTER (WHERE eg.plus_one = true)::int AS plus_one_count,
  -- Aggregate all dietary restrictions from attending/maybe guests
  ARRAY(
    SELECT DISTINCT unnest(eg2.dietary_restrictions)
    FROM event_guests eg2
    WHERE eg2.event_id = eg.event_id
      AND eg2.rsvp_status IN ('attending', 'maybe')
      AND eg2.dietary_restrictions != '{}'
  ) AS all_dietary_restrictions,
  -- Aggregate all allergies from attending/maybe guests
  ARRAY(
    SELECT DISTINCT unnest(eg2.allergies)
    FROM event_guests eg2
    WHERE eg2.event_id = eg.event_id
      AND eg2.rsvp_status IN ('attending', 'maybe')
      AND eg2.allergies != '{}'
  ) AS all_allergies
FROM event_guests eg
GROUP BY eg.event_id, eg.tenant_id;

-- ============================================================
-- RLS: event_shares
-- ============================================================
ALTER TABLE event_shares ENABLE ROW LEVEL SECURITY;

-- Chefs can do everything for their tenant
CREATE POLICY event_shares_chef_all ON event_shares
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Clients can SELECT and INSERT for their own events
CREATE POLICY event_shares_client_select ON event_shares
  FOR SELECT
  USING (
    created_by_client_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'client'
    )
  );

CREATE POLICY event_shares_client_insert ON event_shares
  FOR INSERT
  WITH CHECK (
    created_by_client_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'client'
    )
  );

-- Clients can update their own shares (e.g., revoke)
CREATE POLICY event_shares_client_update ON event_shares
  FOR UPDATE
  USING (
    created_by_client_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'client'
    )
  );

-- Public can SELECT by valid token (for guest access)
CREATE POLICY event_shares_public_select_by_token ON event_shares
  FOR SELECT
  USING (true);
  -- App layer MUST filter by specific token to prevent enumeration

-- ============================================================
-- RLS: event_guests
-- ============================================================
ALTER TABLE event_guests ENABLE ROW LEVEL SECURITY;

-- Chefs can read all guests for their tenant
CREATE POLICY event_guests_chef_all ON event_guests
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Clients can read guests for events they own
CREATE POLICY event_guests_client_select ON event_guests
  FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN user_roles ur ON ur.auth_user_id = auth.uid() AND ur.role = 'client'
      WHERE e.client_id = ur.entity_id
    )
  );

-- Public can INSERT (submit RSVP) -- validated at app layer via share token
CREATE POLICY event_guests_public_insert ON event_guests
  FOR INSERT
  WITH CHECK (true);
  -- App layer validates share token before allowing insert

-- Public can SELECT their own guest record by guest_token
CREATE POLICY event_guests_public_select_by_token ON event_guests
  FOR SELECT
  USING (true);
  -- App layer MUST filter by specific guest_token

-- Public can UPDATE their own RSVP by guest_token
CREATE POLICY event_guests_public_update_by_token ON event_guests
  FOR UPDATE
  USING (true);
  -- App layer MUST filter by specific guest_token

-- ============================================================
-- GRANTS for anon role (unauthenticated guests)
-- ============================================================
GRANT SELECT ON event_shares TO anon;
GRANT SELECT, INSERT, UPDATE ON event_guests TO anon;
GRANT SELECT ON event_rsvp_summary TO anon;
