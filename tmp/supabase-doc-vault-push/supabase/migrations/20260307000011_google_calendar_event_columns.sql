-- Google Calendar sync columns on events table.
-- Tracks the Google Calendar event ID after sync so we can update/delete it.
-- Additive migration only — no existing columns modified.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_synced_at TIMESTAMPTZ;
-- Index for quick reverse-lookup (Google → ChefFlow)
CREATE INDEX IF NOT EXISTS idx_events_google_calendar_event_id
  ON events(google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;
