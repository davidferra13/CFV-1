-- Event Ambiance & Atmosphere Layer
-- Adds ambiance notes to events (per-event atmosphere planning)
-- and ambiance preferences to client taste profiles (per-client defaults)

-- Per-event ambiance notes (music, lighting, table setting, mood, service pace)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS ambiance_notes text;

-- Per-client ambiance preferences (default atmosphere for this client)
ALTER TABLE client_taste_profiles
  ADD COLUMN IF NOT EXISTS ambiance_preferences text;

COMMENT ON COLUMN events.ambiance_notes IS 'Free-text atmosphere planning: music, lighting, table setting, mood, service pace';
COMMENT ON COLUMN client_taste_profiles.ambiance_preferences IS 'Client default atmosphere preferences, seeded into new events';
