-- Event Readiness Assistant
-- Optional advisory layer for financial/pricing/ops readiness. This is not a hard gate.

ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS event_readiness_assistant_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_readiness_assistant_default_mode TEXT NOT NULL DEFAULT 'quiet',
  ADD COLUMN IF NOT EXISTS event_readiness_show_financial BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_readiness_show_pricing_confidence BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_readiness_show_ops BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chef_preferences_event_readiness_default_mode_valid'
  ) THEN
    ALTER TABLE chef_preferences
      ADD CONSTRAINT chef_preferences_event_readiness_default_mode_valid
      CHECK (event_readiness_assistant_default_mode IN ('off', 'quiet', 'normal'));
  END IF;
END $$;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS readiness_assistant_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS readiness_assistant_mode TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_readiness_assistant_mode_valid'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_readiness_assistant_mode_valid
      CHECK (readiness_assistant_mode IS NULL OR readiness_assistant_mode IN ('off', 'quiet', 'normal'));
  END IF;
END $$;

COMMENT ON COLUMN chef_preferences.event_readiness_assistant_enabled IS
  'Global opt-in for the Event Readiness Assistant advisory layer.';
COMMENT ON COLUMN chef_preferences.event_readiness_assistant_default_mode IS
  'Default assistant visibility: off, quiet, or normal.';
COMMENT ON COLUMN events.readiness_assistant_enabled IS
  'Nullable per-event override for Event Readiness Assistant. NULL inherits chef preference.';
COMMENT ON COLUMN events.readiness_assistant_mode IS
  'Nullable per-event assistant visibility override. NULL inherits chef preference.';
