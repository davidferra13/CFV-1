-- National Vendor Directory
-- Platform-wide table (not chef-scoped). Populated from OpenStreetMap specialty food data.
-- Chefs search this and copy vendors to their personal vendors table with one click.

CREATE TABLE IF NOT EXISTS national_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vendor_type TEXT NOT NULL, -- butcher, fishmonger, greengrocer, deli, seafood, cheese, farm, specialty, organic, bakery, liquor, other
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  phone TEXT,
  website TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  osm_id TEXT,              -- OpenStreetMap node/way ID for dedup
  source TEXT NOT NULL DEFAULT 'osm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (osm_id, source)
);

CREATE INDEX IF NOT EXISTS idx_national_vendors_type ON national_vendors(vendor_type);
CREATE INDEX IF NOT EXISTS idx_national_vendors_state ON national_vendors(state);
CREATE INDEX IF NOT EXISTS idx_national_vendors_city ON national_vendors(city);
CREATE INDEX IF NOT EXISTS idx_national_vendors_phone ON national_vendors(phone) WHERE phone IS NOT NULL;

-- Full-text search index for name + city
CREATE INDEX IF NOT EXISTS idx_national_vendors_fts
  ON national_vendors USING gin(to_tsvector('english', name || ' ' || city || ' ' || state));
