-- Timezone Support
-- Adds timezone columns to chefs (default) and events (per-event override).
-- NULL on events.event_timezone = inherit from chef.timezone.
-- Additive migration — no existing columns modified.

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_timezone TEXT;
-- NULL = use chef.timezone for this event (safe fallback for all existing events)

-- Reasonable validation constraint on chef timezone (non-empty)
ALTER TABLE chefs
  ADD CONSTRAINT chefs_timezone_nonempty CHECK (timezone <> '');
