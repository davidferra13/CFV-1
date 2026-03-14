-- Add location coordinates to events table
-- Stores lat/lng from Google Places autocomplete for map display
-- Nullable: existing events without coordinates simply won't show a map

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision;

COMMENT ON COLUMN events.location_lat IS 'Latitude from Google Places, for map display';
COMMENT ON COLUMN events.location_lng IS 'Longitude from Google Places, for map display';
