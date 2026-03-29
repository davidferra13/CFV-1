-- Add geo, search, and source columns to directory_listings for the OpenClaw crawler import
-- ~200K enriched US food business records from OpenStreetMap

-- New columns
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS lon double precision;
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS lead_score integer;
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS osm_id text;

-- Full-text search vector (auto-updated via trigger)
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION directory_listings_search_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.state, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.cuisine_types, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_directory_listings_search ON directory_listings;
CREATE TRIGGER trg_directory_listings_search
  BEFORE INSERT OR UPDATE ON directory_listings
  FOR EACH ROW
  EXECUTE FUNCTION directory_listings_search_trigger();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_directory_listings_search_vector
  ON directory_listings USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_directory_listings_geo
  ON directory_listings(lat, lon) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_directory_listings_osm_id
  ON directory_listings(osm_id) WHERE osm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_directory_listings_lead_score
  ON directory_listings(lead_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_directory_listings_state_city
  ON directory_listings(state, city) WHERE status != 'removed';
CREATE INDEX IF NOT EXISTS idx_directory_listings_postcode
  ON directory_listings(postcode) WHERE postcode IS NOT NULL;

-- Composite index for paginated browsing
CREATE INDEX IF NOT EXISTS idx_directory_listings_browse
  ON directory_listings(state, lead_score DESC NULLS LAST, name)
  WHERE status != 'removed';
