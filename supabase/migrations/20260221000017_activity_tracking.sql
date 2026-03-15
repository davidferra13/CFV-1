-- ============================================================================
-- Activity Tracking — Phase 4
-- Lightweight event tracking for client engagement visibility.
-- Tracks high-signal actions: portal logins, event views, quote views, etc.
-- Enabled for Supabase Realtime for live "who's online" dashboard.
-- ============================================================================

CREATE TABLE activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Who
  actor_type TEXT NOT NULL CHECK (actor_type IN ('client', 'chef', 'system')),
  actor_id UUID,        -- auth_user_id for clients/chefs, NULL for system
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- What
  event_type TEXT NOT NULL,
  -- Values: 'portal_login', 'event_viewed', 'quote_viewed', 'invoice_viewed',
  --   'proposal_viewed', 'chat_message_sent', 'rsvp_submitted', 'form_submitted',
  --   'page_viewed'

  -- Context
  entity_type TEXT,     -- 'event', 'quote', 'invoice', 'conversation'
  entity_id UUID,

  -- Metadata (page path, device info, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optimized for "who's active right now" queries
CREATE INDEX idx_activity_tenant_recent
  ON activity_events(tenant_id, created_at DESC);

-- Per-client activity timeline
CREATE INDEX idx_activity_client
  ON activity_events(tenant_id, client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

-- Filter by event type
CREATE INDEX idx_activity_type
  ON activity_events(tenant_id, event_type, created_at DESC);

-- ─── RLS Policies ─────────────────────────────────────────────────────────

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- Chefs can read activity for their tenant
DROP POLICY IF EXISTS "Chefs read own tenant activity" ON activity_events;
CREATE POLICY "Chefs read own tenant activity"
  ON activity_events
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Clients can insert their own activity (for portal tracking)
DROP POLICY IF EXISTS "Clients insert own activity" ON activity_events;
CREATE POLICY "Clients insert own activity"
  ON activity_events
  FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    AND actor_type = 'client'
  );

-- Service role can manage all activity (for server-side tracking + cleanup)
DROP POLICY IF EXISTS "Service role manages activity" ON activity_events;
CREATE POLICY "Service role manages activity"
  ON activity_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Enable Realtime for live dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE activity_events;
