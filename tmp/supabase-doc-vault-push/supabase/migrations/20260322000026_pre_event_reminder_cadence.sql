-- Pre-Event Reminder Cadence — 30d and 14d client reminders
-- Adds two new dedup columns to events and configurable per-interval toggles
-- to chef_automation_settings. Additive only.

-- ── 1. New dedup columns on events ─────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS client_reminder_30d_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_reminder_14d_sent_at TIMESTAMPTZ;
COMMENT ON COLUMN events.client_reminder_30d_sent_at IS
  'Set after 30-day pre-event client reminder email fires. Null = not yet sent.';
COMMENT ON COLUMN events.client_reminder_14d_sent_at IS
  'Set after 14-day pre-event client reminder email fires. Null = not yet sent.';
-- ── 2. Configurable reminder intervals on chef_automation_settings ─────────
-- Default: all five intervals enabled. Chef can disable any.
ALTER TABLE chef_automation_settings
  ADD COLUMN IF NOT EXISTS event_reminder_30d_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_reminder_14d_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_reminder_7d_enabled  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_reminder_2d_enabled  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_reminder_1d_enabled  BOOLEAN NOT NULL DEFAULT true;
COMMENT ON COLUMN chef_automation_settings.event_reminder_30d_enabled IS
  'When false, the 30-day pre-event client email is skipped.';
COMMENT ON COLUMN chef_automation_settings.event_reminder_14d_enabled IS
  'When false, the 14-day pre-event client email is skipped.';
COMMENT ON COLUMN chef_automation_settings.event_reminder_7d_enabled IS
  'When false, the 7-day prepare email is skipped.';
COMMENT ON COLUMN chef_automation_settings.event_reminder_2d_enabled IS
  'When false, the 2-day reminder email is skipped.';
COMMENT ON COLUMN chef_automation_settings.event_reminder_1d_enabled IS
  'When false, the 1-day reminder email is skipped.';
