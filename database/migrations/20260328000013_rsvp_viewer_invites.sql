-- RSVP Viewer/Guest Invite Layer
-- Adds role-based invite links so hosts/guests can share dinner context with
-- non-party people as either read-only viewers or join-request candidates.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'share_audience_role') THEN
    CREATE TYPE share_audience_role AS ENUM ('viewer', 'guest');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_share_invite_status') THEN
    CREATE TYPE event_share_invite_status AS ENUM (
      'active',
      'consumed',
      'revoked',
      'expired'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS event_share_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_share_id UUID NOT NULL REFERENCES event_shares(id) ON DELETE CASCADE,
  created_by_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_by_guest_token TEXT,
  token TEXT NOT NULL UNIQUE,
  audience_role share_audience_role NOT NULL,
  status event_share_invite_status NOT NULL DEFAULT 'active',
  invited_name TEXT,
  invited_email TEXT,
  note TEXT,
  expires_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  consumed_by_guest_id UUID REFERENCES event_guests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_share_invites_token ON event_share_invites(token);
CREATE INDEX IF NOT EXISTS idx_event_share_invites_event ON event_share_invites(event_id);
CREATE INDEX IF NOT EXISTS idx_event_share_invites_tenant ON event_share_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_share_invites_share ON event_share_invites(event_share_id);
CREATE INDEX IF NOT EXISTS idx_event_share_invites_status ON event_share_invites(status);

DROP TRIGGER IF EXISTS set_event_share_invites_updated_at ON event_share_invites;
CREATE TRIGGER set_event_share_invites_updated_at
  BEFORE UPDATE ON event_share_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE event_share_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_share_invites_chef_all ON event_share_invites;
CREATE POLICY event_share_invites_chef_all ON event_share_invites
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS event_share_invites_client_select ON event_share_invites;
CREATE POLICY event_share_invites_client_select ON event_share_invites
  FOR SELECT
  USING (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN user_roles ur ON ur.auth_user_id = auth.uid() AND ur.role = 'client'
      WHERE e.client_id = ur.entity_id
    )
  );

DROP POLICY IF EXISTS event_share_invites_client_insert ON event_share_invites;
CREATE POLICY event_share_invites_client_insert ON event_share_invites
  FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN user_roles ur ON ur.auth_user_id = auth.uid() AND ur.role = 'client'
      WHERE e.client_id = ur.entity_id
    )
  );

DROP POLICY IF EXISTS event_share_invites_client_update ON event_share_invites;
CREATE POLICY event_share_invites_client_update ON event_share_invites
  FOR UPDATE
  USING (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN user_roles ur ON ur.auth_user_id = auth.uid() AND ur.role = 'client'
      WHERE e.client_id = ur.entity_id
    )
  );

-- Viewer lead attribution fields (fully optional and backward-compatible).
ALTER TABLE guest_leads
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_invite_token TEXT,
  ADD COLUMN IF NOT EXISTS source_event_share_id UUID REFERENCES event_shares(id) ON DELETE SET NULL;

UPDATE guest_leads
SET source = COALESCE(source, 'guest_qr');

ALTER TABLE guest_leads
  ALTER COLUMN source SET DEFAULT 'guest_qr';

CREATE INDEX IF NOT EXISTS idx_guest_leads_source ON guest_leads(tenant_id, source);
