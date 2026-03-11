-- RSVP Enhancements Wave 2
-- 1) Join approval workflow
-- 2) RSVP deadlines + reminders
-- 3) Capacity guardrails + waitlist metadata
-- 4) Structured dietary severity records
-- 5) RSVP audit trail
-- 6) Invite anti-abuse controls (single-use + permissions)
-- 7) Invite lifecycle controls
-- 8) Invite analytics event stream
-- 9) Guest communication logs

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_join_request_status') THEN
    CREATE TYPE event_join_request_status AS ENUM ('pending', 'approved', 'denied');
  END IF;
END$$;
ALTER TABLE event_shares
  ADD COLUMN IF NOT EXISTS require_join_approval BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rsvp_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_schedule TEXT[] NOT NULL DEFAULT ARRAY['7d', '3d', '24h'],
  ADD COLUMN IF NOT EXISTS enforce_capacity BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_capacity INTEGER CHECK (max_capacity IS NULL OR max_capacity > 0);
UPDATE event_shares es
SET rsvp_deadline_at = (e.event_date::timestamp - interval '2 day')
FROM events e
WHERE e.id = es.event_id
  AND es.rsvp_deadline_at IS NULL;
ALTER TABLE event_share_invites
  ADD COLUMN IF NOT EXISTS single_use BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_join_request BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_book_own BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT;
CREATE TABLE IF NOT EXISTS event_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_share_id UUID NOT NULL REFERENCES event_shares(id) ON DELETE CASCADE,
  invite_id UUID REFERENCES event_share_invites(id) ON DELETE SET NULL,
  viewer_name TEXT NOT NULL,
  viewer_email TEXT NOT NULL,
  note TEXT,
  status event_join_request_status NOT NULL DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  resolved_by_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  resolution_note TEXT,
  guest_id UUID REFERENCES event_guests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_join_requests_event ON event_join_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_join_requests_tenant ON event_join_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_join_requests_status ON event_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_event_join_requests_email ON event_join_requests(viewer_email);
DROP TRIGGER IF EXISTS set_event_join_requests_updated_at ON event_join_requests;
CREATE TRIGGER set_event_join_requests_updated_at
  BEFORE UPDATE ON event_join_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE event_guests
  ADD COLUMN IF NOT EXISTS attendance_queue_status TEXT NOT NULL DEFAULT 'none'
    CHECK (attendance_queue_status IN ('none', 'waitlisted', 'promoted')),
  ADD COLUMN IF NOT EXISTS waitlisted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS event_guest_dietary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('guest', 'plus_one')),
  item_type TEXT NOT NULL CHECK (item_type IN ('dietary', 'allergy')),
  label TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('preference', 'intolerance', 'anaphylaxis')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_guest_dietary_items_event ON event_guest_dietary_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_guest_dietary_items_guest ON event_guest_dietary_items(guest_id);
CREATE INDEX IF NOT EXISTS idx_event_guest_dietary_items_severity ON event_guest_dietary_items(severity);
DROP TRIGGER IF EXISTS set_event_guest_dietary_items_updated_at ON event_guest_dietary_items;
CREATE TRIGGER set_event_guest_dietary_items_updated_at
  BEFORE UPDATE ON event_guest_dietary_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TABLE IF NOT EXISTS event_guest_rsvp_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
  guest_token TEXT NOT NULL,
  action TEXT NOT NULL,
  before_values JSONB,
  after_values JSONB,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  changed_by TEXT NOT NULL DEFAULT 'public_token',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_guest_rsvp_audit_event ON event_guest_rsvp_audit(event_id);
CREATE INDEX IF NOT EXISTS idx_event_guest_rsvp_audit_guest ON event_guest_rsvp_audit(guest_id);
CREATE INDEX IF NOT EXISTS idx_event_guest_rsvp_audit_critical ON event_guest_rsvp_audit(is_critical);
CREATE TABLE IF NOT EXISTS event_share_invite_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invite_id UUID REFERENCES event_share_invites(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'viewed',
      'join_requested',
      'join_approved',
      'join_denied',
      'book_own_requested',
      'guest_invited',
      'revoked'
    )
  ),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_share_invite_events_event ON event_share_invite_events(event_id);
CREATE INDEX IF NOT EXISTS idx_event_share_invite_events_invite ON event_share_invite_events(invite_id);
CREATE INDEX IF NOT EXISTS idx_event_share_invite_events_type ON event_share_invite_events(event_type);
CREATE TABLE IF NOT EXISTS rsvp_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
  reminder_key TEXT NOT NULL,
  delivery_channel TEXT NOT NULL DEFAULT 'draft',
  recipient_email TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvp_reminder_log_unique
  ON rsvp_reminder_log(guest_id, reminder_key);
CREATE INDEX IF NOT EXISTS idx_rsvp_reminder_log_event ON rsvp_reminder_log(event_id);
CREATE TABLE IF NOT EXISTS guest_communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  segment TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_by_auth_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guest_communication_logs_event ON guest_communication_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_communication_logs_tenant ON guest_communication_logs(tenant_id);
ALTER TABLE guest_leads
  ADD COLUMN IF NOT EXISTS source_join_request_id UUID REFERENCES event_join_requests(id) ON DELETE SET NULL;
DROP VIEW IF EXISTS event_rsvp_summary;
CREATE VIEW event_rsvp_summary AS
SELECT
  eg.event_id,
  eg.tenant_id,
  COUNT(*)::int AS total_guests,
  COUNT(*) FILTER (WHERE eg.rsvp_status = 'attending')::int AS attending_count,
  COUNT(*) FILTER (WHERE eg.rsvp_status = 'declined')::int AS declined_count,
  COUNT(*) FILTER (WHERE eg.rsvp_status = 'maybe')::int AS maybe_count,
  COUNT(*) FILTER (
    WHERE eg.rsvp_status = 'pending' AND COALESCE(eg.attendance_queue_status, 'none') <> 'waitlisted'
  )::int AS pending_count,
  COUNT(*) FILTER (WHERE COALESCE(eg.attendance_queue_status, 'none') = 'waitlisted')::int AS waitlisted_count,
  COUNT(*) FILTER (WHERE eg.plus_one = true)::int AS plus_one_count,
  ARRAY(
    SELECT DISTINCT unnest(eg2.dietary_restrictions)
    FROM event_guests eg2
    WHERE eg2.event_id = eg.event_id
      AND eg2.rsvp_status IN ('attending', 'maybe')
      AND eg2.dietary_restrictions != '{}'
  ) AS all_dietary_restrictions,
  ARRAY(
    SELECT DISTINCT unnest(eg2.allergies)
    FROM event_guests eg2
    WHERE eg2.event_id = eg.event_id
      AND eg2.rsvp_status IN ('attending', 'maybe')
      AND eg2.allergies != '{}'
  ) AS all_allergies
FROM event_guests eg
GROUP BY eg.event_id, eg.tenant_id;
-- RLS for new tables
ALTER TABLE event_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_guest_dietary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_guest_rsvp_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_share_invite_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_reminder_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_communication_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_join_requests_chef_all ON event_join_requests;
CREATE POLICY event_join_requests_chef_all ON event_join_requests
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS event_join_requests_client_select ON event_join_requests;
CREATE POLICY event_join_requests_client_select ON event_join_requests
  FOR SELECT
  USING (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN user_roles ur ON ur.auth_user_id = auth.uid() AND ur.role = 'client'
      WHERE e.client_id = ur.entity_id
    )
  );
DROP POLICY IF EXISTS event_join_requests_client_update ON event_join_requests;
CREATE POLICY event_join_requests_client_update ON event_join_requests
  FOR UPDATE
  USING (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN user_roles ur ON ur.auth_user_id = auth.uid() AND ur.role = 'client'
      WHERE e.client_id = ur.entity_id
    )
  );
DROP POLICY IF EXISTS event_guest_dietary_items_chef_all ON event_guest_dietary_items;
CREATE POLICY event_guest_dietary_items_chef_all ON event_guest_dietary_items
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS event_guest_dietary_items_client_select ON event_guest_dietary_items;
CREATE POLICY event_guest_dietary_items_client_select ON event_guest_dietary_items
  FOR SELECT
  USING (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN user_roles ur ON ur.auth_user_id = auth.uid() AND ur.role = 'client'
      WHERE e.client_id = ur.entity_id
    )
  );
DROP POLICY IF EXISTS event_guest_rsvp_audit_chef_all ON event_guest_rsvp_audit;
CREATE POLICY event_guest_rsvp_audit_chef_all ON event_guest_rsvp_audit
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS event_guest_rsvp_audit_client_select ON event_guest_rsvp_audit;
CREATE POLICY event_guest_rsvp_audit_client_select ON event_guest_rsvp_audit
  FOR SELECT
  USING (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN user_roles ur ON ur.auth_user_id = auth.uid() AND ur.role = 'client'
      WHERE e.client_id = ur.entity_id
    )
  );
DROP POLICY IF EXISTS event_share_invite_events_chef_all ON event_share_invite_events;
CREATE POLICY event_share_invite_events_chef_all ON event_share_invite_events
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS event_share_invite_events_client_select ON event_share_invite_events;
CREATE POLICY event_share_invite_events_client_select ON event_share_invite_events
  FOR SELECT
  USING (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN user_roles ur ON ur.auth_user_id = auth.uid() AND ur.role = 'client'
      WHERE e.client_id = ur.entity_id
    )
  );
DROP POLICY IF EXISTS rsvp_reminder_log_chef_all ON rsvp_reminder_log;
CREATE POLICY rsvp_reminder_log_chef_all ON rsvp_reminder_log
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS rsvp_reminder_log_client_select ON rsvp_reminder_log;
CREATE POLICY rsvp_reminder_log_client_select ON rsvp_reminder_log
  FOR SELECT
  USING (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN user_roles ur ON ur.auth_user_id = auth.uid() AND ur.role = 'client'
      WHERE e.client_id = ur.entity_id
    )
  );
DROP POLICY IF EXISTS guest_communication_logs_chef_all ON guest_communication_logs;
CREATE POLICY guest_communication_logs_chef_all ON guest_communication_logs
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS guest_communication_logs_client_select ON guest_communication_logs;
CREATE POLICY guest_communication_logs_client_select ON guest_communication_logs
  FOR SELECT
  USING (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN user_roles ur ON ur.auth_user_id = auth.uid() AND ur.role = 'client'
      WHERE e.client_id = ur.entity_id
    )
  );
