-- Migration: Public Availability Signals
-- Adds chef-level opt-in to broadcast "seeking bookings" signals on their public profile,
-- client-level opt-in/out for receiving notifications about those signals,
-- and a deduplication log to prevent re-notifying the same client about the same signal.
-- All additions are additive (ALTER TABLE ADD COLUMN with safe defaults).

-- Chef opt-in: show target_booking signals on public profile
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS show_availability_signals BOOLEAN NOT NULL DEFAULT false;
-- false = disabled by default (private); chef must explicitly enable

COMMENT ON COLUMN chefs.show_availability_signals IS
  'When true, chef''s public target_booking calendar entries appear on their public profile page as "Seeking bookings for these dates".';

-- Client opt-in: receive notifications when a chef they know posts a new public signal
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS availability_signal_notifications BOOLEAN NOT NULL DEFAULT true;
-- true = opted-in by default; client can opt-out in their profile settings

COMMENT ON COLUMN clients.availability_signal_notifications IS
  'When true, client receives a notification when their chef posts a new public availability signal (target booking date). Client can opt-out.';

-- Notification deduplication log
-- Ensures each client is only notified once per calendar entry
CREATE TABLE IF NOT EXISTS availability_signal_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  calendar_entry_id UUID NOT NULL REFERENCES chef_calendar_entries(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deduplicate: one notification per (entry, client) pair
CREATE UNIQUE INDEX idx_signal_notif_dedup
  ON availability_signal_notification_log(calendar_entry_id, client_id);

CREATE INDEX idx_signal_notif_chef
  ON availability_signal_notification_log(chef_id, notified_at DESC);

-- RLS
ALTER TABLE availability_signal_notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef owns signal notification log" ON availability_signal_notification_log;
CREATE POLICY "chef owns signal notification log"
  ON availability_signal_notification_log
  FOR ALL
  USING (
    chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
