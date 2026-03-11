-- Menu Approval Workflow
-- Enables chefs to send a menu snapshot to clients for formal approval before an event.
-- Adds approval status columns to events and a menu_approval_requests table for history.

-- ============================================
-- ENUM: Menu approval status
-- ============================================

CREATE TYPE menu_approval_status AS ENUM (
  'not_sent',          -- No menu sent yet (default)
  'sent',              -- Sent to client, awaiting response
  'approved',          -- Client approved
  'revision_requested' -- Client requested changes
);
-- ============================================
-- Add approval tracking columns to events
-- ============================================

ALTER TABLE events
  ADD COLUMN menu_approval_status menu_approval_status NOT NULL DEFAULT 'not_sent',
  ADD COLUMN menu_sent_at         TIMESTAMPTZ,
  ADD COLUMN menu_approved_at     TIMESTAMPTZ,
  ADD COLUMN menu_revision_notes  TEXT;
COMMENT ON COLUMN events.menu_approval_status IS 'Client menu approval state. Updated when chef sends menu and when client responds.';
COMMENT ON COLUMN events.menu_revision_notes  IS 'Client notes when requesting menu revisions.';
-- ============================================
-- TABLE: Menu approval requests (history log)
-- One row per send — supports multiple rounds of revision
-- ============================================

CREATE TABLE menu_approval_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id          UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,

  -- Snapshot of menu(s) at time of send (array of dish names or structured JSONB)
  menu_snapshot    JSONB NOT NULL DEFAULT '[]',

  -- Lifecycle
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at     TIMESTAMPTZ,
  status           menu_approval_status NOT NULL DEFAULT 'sent',
  revision_notes   TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_approvals_event  ON menu_approval_requests(event_id);
CREATE INDEX idx_menu_approvals_chef   ON menu_approval_requests(chef_id, status);
CREATE INDEX idx_menu_approvals_client ON menu_approval_requests(client_id);
COMMENT ON TABLE menu_approval_requests IS 'Each row is one send-for-approval request. Multiple rounds of revision are supported.';
COMMENT ON COLUMN menu_approval_requests.menu_snapshot IS 'JSONB array of menu items at the time of this send. Preserved for reference after changes.';
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE menu_approval_requests ENABLE ROW LEVEL SECURITY;
-- Chef: full access to their own approval requests
CREATE POLICY mar_chef_select ON menu_approval_requests
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY mar_chef_insert ON menu_approval_requests
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
-- Chef can update status (e.g., to re-send or cancel)
CREATE POLICY mar_chef_update ON menu_approval_requests
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
-- Client: read their own requests; update to record approval/revision response
CREATE POLICY mar_client_select ON menu_approval_requests
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
CREATE POLICY mar_client_update ON menu_approval_requests
  FOR UPDATE USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id() AND
    status = 'sent'  -- client can only respond to pending requests
  );
