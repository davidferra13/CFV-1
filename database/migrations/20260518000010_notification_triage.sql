-- Notification Triage Support
-- Adds snooze capability to notifications and creates triage audit log.

-- 1. Add snoozed_until column to notifications table
-- Nullable timestamp: when set and in the future, notification is hidden from inbox.
-- When the timestamp passes, notification reappears automatically.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS snoozed_until timestamptz DEFAULT NULL;

-- Index for efficient filtering of snoozed notifications
CREATE INDEX IF NOT EXISTS idx_notifications_snoozed_until
  ON notifications (recipient_id, snoozed_until)
  WHERE snoozed_until IS NOT NULL AND archived_at IS NULL;

-- 2. Triage audit log: tracks bulk operations for analytics and undo support
CREATE TABLE IF NOT EXISTS notification_triage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL,
  notification_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  action text NOT NULL CHECK (action IN ('mark_read', 'mark_unread', 'snooze', 'unsnooze')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying triage history per chef
CREATE INDEX IF NOT EXISTS idx_notification_triage_log_chef
  ON notification_triage_log (chef_id, created_at DESC);

-- RLS: chefs can only see their own triage log entries
ALTER TABLE notification_triage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chefs_own_triage_log" ON notification_triage_log
  FOR ALL USING (chef_id = auth.uid());
