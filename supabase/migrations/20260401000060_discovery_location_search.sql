-- Adds normalized ZIP + coordinate support for discovery profiles so the
-- public chef directory can support ZIP and proximity-based search.

ALTER TABLE chef_marketplace_profiles
  ADD COLUMN IF NOT EXISTS service_area_zip TEXT,
  ADD COLUMN IF NOT EXISTS service_area_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS service_area_lng DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_chef_marketplace_profiles_zip
  ON chef_marketplace_profiles(service_area_zip);

CREATE INDEX IF NOT EXISTS idx_chef_marketplace_profiles_coords
  ON chef_marketplace_profiles(service_area_lat, service_area_lng)
  WHERE service_area_lat IS NOT NULL AND service_area_lng IS NOT NULL;

COMMENT ON COLUMN chef_marketplace_profiles.service_area_zip IS
  'Normalized postal code used for public directory search and proximity matching.';

COMMENT ON COLUMN chef_marketplace_profiles.service_area_lat IS
  'Latitude for the chef discovery service-area anchor.';

COMMENT ON COLUMN chef_marketplace_profiles.service_area_lng IS
  'Longitude for the chef discovery service-area anchor.';
