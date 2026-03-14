-- Notification System
-- Persistent notification history with real-time delivery
-- Tables: notifications, notification_preferences
-- Supports: chef-facing alerts for inquiries, quotes, events, payments, chat, clients

-- ─── Tables ─────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant scoping
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Classification
  category TEXT NOT NULL,    -- 'inquiry', 'quote', 'event', 'payment', 'chat', 'client', 'system'
  action TEXT NOT NULL,      -- 'new_inquiry', 'quote_accepted', 'payment_received', etc.

  -- Display
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,           -- Where clicking navigates (/events/uuid, /inquiries/uuid, etc.)

  -- Context links (nullable - for joining/querying)
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- State
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Metadata (extensible)
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE notifications IS 'Persistent notification history for chefs. Real-time delivery via Supabase Realtime.';

-- Primary query: unread notifications for a user (bell badge + panel)
CREATE INDEX idx_notifications_recipient_unread
  ON notifications(recipient_id, created_at DESC)
  WHERE read_at IS NULL AND archived_at IS NULL;

-- Secondary query: all non-archived notifications for a user (panel scroll)
CREATE INDEX idx_notifications_recipient_all
  ON notifications(recipient_id, created_at DESC)
  WHERE archived_at IS NULL;

-- Tenant isolation queries
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);


-- Notification preferences: per-user, per-category toast toggle
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  toast_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(auth_user_id, category)
);

COMMENT ON TABLE notification_preferences IS 'Per-category toast notification preferences. Missing row = toast enabled (default).';

CREATE INDEX idx_notification_prefs_user ON notification_preferences(auth_user_id);

-- Auto-update updated_at on preferences (reuses existing function from Layer 1)
CREATE TRIGGER notification_preferences_updated_at
BEFORE UPDATE ON notification_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─── Helper Functions ───────────────────────────────────────────────────

-- Get unread notification count for nav badge
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::integer
  FROM notifications
  WHERE recipient_id = p_user_id
    AND read_at IS NULL
    AND archived_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_unread_notification_count IS 'Returns unread notification count for a user. Used for nav badge.';


-- ─── Row Level Security ─────────────────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- NOTIFICATIONS POLICIES

-- Recipients can read their own notifications
CREATE POLICY notifications_recipient_select ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- Chefs can also read all notifications in their tenant (for admin/audit)
CREATE POLICY notifications_chef_tenant_select ON notifications
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Server actions insert via service role, but allow chef insert for their tenant
CREATE POLICY notifications_insert ON notifications
  FOR INSERT WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Recipients can update their own notifications (mark read, archive)
CREATE POLICY notifications_recipient_update ON notifications
  FOR UPDATE USING (recipient_id = auth.uid());

-- No hard deletes
CREATE POLICY notifications_no_delete ON notifications
  FOR DELETE USING (false);


-- NOTIFICATION_PREFERENCES POLICIES

-- Users can read their own preferences
CREATE POLICY notification_prefs_self_select ON notification_preferences
  FOR SELECT USING (auth_user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY notification_prefs_self_insert ON notification_preferences
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY notification_prefs_self_update ON notification_preferences
  FOR UPDATE USING (auth_user_id = auth.uid());

-- No hard deletes on preferences
CREATE POLICY notification_prefs_no_delete ON notification_preferences
  FOR DELETE USING (false);


-- ─── Enable Realtime ────────────────────────────────────────────────────

-- Allow Supabase Realtime to broadcast INSERT events on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ─── End of Notification System ─────────────────────────────────────────
