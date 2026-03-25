-- Event Lock-In: allows a chef to "lock in" to a single event,
-- filtering the nav to show only event-relevant sections.
-- When locked_event_id is NULL, the app is in normal mode.
-- When set, the sidebar filters to event-relevant groups only.

ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS locked_event_id UUID REFERENCES events(id) ON DELETE SET NULL DEFAULT NULL;
COMMENT ON COLUMN chef_preferences.locked_event_id IS
  'When set, chef is in event lock-in mode. Nav shows only event-relevant sections.';
