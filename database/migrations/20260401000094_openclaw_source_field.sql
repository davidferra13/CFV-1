-- Add source tracking to openclaw_leads for multi-source ingestion
-- Sources: osm (OpenStreetMap crawler), boston_opendata, yelp, thumbtack, etc.

ALTER TABLE openclaw_leads ADD COLUMN IF NOT EXISTS source text DEFAULT 'osm';
ALTER TABLE openclaw_leads ADD COLUMN IF NOT EXISTS source_id text; -- Original ID from source system
ALTER TABLE openclaw_leads ADD COLUMN IF NOT EXISTS source_url text; -- Link back to source listing
ALTER TABLE openclaw_leads ADD COLUMN IF NOT EXISTS license_type text; -- Food license category
ALTER TABLE openclaw_leads ADD COLUMN IF NOT EXISTS license_status text; -- active, expired, etc.
ALTER TABLE openclaw_leads ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE openclaw_leads ADD COLUMN IF NOT EXISTS dba_name text; -- "Doing Business As"
ALTER TABLE openclaw_leads ADD COLUMN IF NOT EXISTS rating numeric(2,1); -- Yelp/Google rating
ALTER TABLE openclaw_leads ADD COLUMN IF NOT EXISTS review_count integer;
ALTER TABLE openclaw_leads ADD COLUMN IF NOT EXISTS last_inspected_at timestamptz;

-- Drop the unique constraint on osm_id (not all sources have OSM IDs)
-- Replace with a composite unique on (source, source_id)
ALTER TABLE openclaw_leads DROP CONSTRAINT IF EXISTS openclaw_leads_osm_id_key;
ALTER TABLE openclaw_leads ALTER COLUMN osm_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_openclaw_leads_source_id
  ON openclaw_leads (source, source_id) WHERE source_id IS NOT NULL;

-- Keep osm_id unique for OSM records
CREATE UNIQUE INDEX IF NOT EXISTS idx_openclaw_leads_osm_id
  ON openclaw_leads (osm_id) WHERE osm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_openclaw_leads_source ON openclaw_leads (source);
