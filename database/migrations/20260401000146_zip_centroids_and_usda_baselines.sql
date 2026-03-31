-- ZIP centroid table: resolves any US ZIP to coordinates + census region.
-- USDA price baselines: BLS average retail food prices by census region.
-- Together these enable: any ingredient + any ZIP = regionally appropriate price.

-- ── ZIP Centroids ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS openclaw.zip_centroids (
  zip       TEXT PRIMARY KEY,
  city      TEXT,
  state     TEXT NOT NULL,
  county    TEXT,
  lat       DOUBLE PRECISION NOT NULL,
  lng       DOUBLE PRECISION NOT NULL,
  region    TEXT NOT NULL  -- 'northeast', 'midwest', 'south', 'west'
);

CREATE INDEX IF NOT EXISTS idx_zip_centroids_state ON openclaw.zip_centroids(state);
CREATE INDEX IF NOT EXISTS idx_zip_centroids_region ON openclaw.zip_centroids(region);

-- ── USDA Regional Price Baselines ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS openclaw.usda_price_baselines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name       TEXT NOT NULL,           -- e.g. 'chicken breast boneless'
  bls_series_base TEXT,                    -- e.g. 'FF1101' (without area prefix)
  price_cents     INTEGER NOT NULL,        -- price in cents
  unit            TEXT NOT NULL,           -- 'lb', 'dozen', 'gallon', 'each', etc.
  region          TEXT NOT NULL,           -- 'us_average', 'northeast', 'midwest', 'south', 'west'
  observation_date DATE NOT NULL,          -- when BLS published this price
  category        TEXT,                    -- 'protein', 'dairy', 'produce', 'grain', 'pantry', 'oil'
  UNIQUE(item_name, region)
);

CREATE INDEX IF NOT EXISTS idx_usda_baselines_item ON openclaw.usda_price_baselines(item_name);
CREATE INDEX IF NOT EXISTS idx_usda_baselines_region ON openclaw.usda_price_baselines(region);
CREATE INDEX IF NOT EXISTS idx_usda_baselines_category ON openclaw.usda_price_baselines(category);
