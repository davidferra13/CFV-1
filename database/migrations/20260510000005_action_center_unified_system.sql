-- Action Center: Unified Notifications + Reminders + Tasks System
-- Additive migration only. No drops, no renames, no data loss.
-- Enables: snooze on reminders, time estimates on tasks, smart cross-system routing.

-- ─── 1. chef_todos (reminders): snooze + recurring + location ────────────

ALTER TABLE chef_todos
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recurring_rule JSONB,
  ADD COLUMN IF NOT EXISTS location_trigger JSONB;

-- Snoozed reminders query (lifecycle cron picks these up)
CREATE INDEX IF NOT EXISTS chef_todos_snoozed_idx
  ON chef_todos (chef_id, snoozed_until)
  WHERE snoozed_until IS NOT NULL AND completed = false;

COMMENT ON COLUMN chef_todos.snoozed_until IS 'Snooze until this timestamp; reminder re-fires after';
COMMENT ON COLUMN chef_todos.recurring_rule IS 'Recurrence: { frequency, days_of_week, day_of_month, end_date }';
COMMENT ON COLUMN chef_todos.location_trigger IS 'Location-based: { label, lat, lng, radius_m }';

-- ─── 2. tasks: time estimates + auto-source tracking ─────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS time_estimate_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS auto_source TEXT,
  ADD COLUMN IF NOT EXISTS source_notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_reminder_id UUID REFERENCES chef_todos(id) ON DELETE SET NULL;

-- Auto-generated tasks query
CREATE INDEX IF NOT EXISTS idx_tasks_auto_source
  ON tasks(chef_id, auto_source)
  WHERE auto_source IS NOT NULL;

COMMENT ON COLUMN tasks.time_estimate_minutes IS 'Rough time estimate for this task in minutes';
COMMENT ON COLUMN tasks.auto_source IS 'Which system auto-created: notification, reminder, event, template';
COMMENT ON COLUMN tasks.source_notification_id IS 'Notification that spawned this task (smart routing)';
COMMENT ON COLUMN tasks.source_reminder_id IS 'Reminder that escalated into this task';

-- ─── 3. notifications: action routing + digest grouping ──────────────────

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS requires_action BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS digest_group TEXT;

-- Actionable notifications needing resolution
CREATE INDEX IF NOT EXISTS idx_notifications_actionable
  ON notifications(recipient_id, requires_action)
  WHERE requires_action = true AND archived_at IS NULL;

-- Digest grouping for batch display
CREATE INDEX IF NOT EXISTS idx_notifications_digest
  ON notifications(recipient_id, digest_group, created_at DESC)
  WHERE digest_group IS NOT NULL AND archived_at IS NULL;

COMMENT ON COLUMN notifications.requires_action IS 'True if this notification should auto-create a task';
COMMENT ON COLUMN notifications.linked_task_id IS 'Task created from this notification via smart routing';
COMMENT ON COLUMN notifications.digest_group IS 'Group key for batching similar notifications';
