-- OpenClaw Leads table
-- Stores enriched, categorized, and AI-classified food business leads
-- collected by the Pi crawler and enrichment pipeline.
-- Used by the ChefFlow prospecting features.

CREATE TABLE IF NOT EXISTS openclaw_leads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  osm_id text NOT NULL UNIQUE,
  name text NOT NULL,
  amenity text,
  shop text,
  cuisine text,
  phone text,
  email text,
  website text,
  street text,
  housenumber text,
  city text,
  state text,
  postcode text,
  country text DEFAULT 'US',
  lat double precision,
  lon double precision,
  opening_hours text,
  outdoor_seating boolean DEFAULT false,
  takeaway boolean DEFAULT false,
  delivery boolean DEFAULT false,
  diet_vegan boolean DEFAULT false,
  diet_vegetarian boolean DEFAULT false,
  diet_gluten_free boolean DEFAULT false,
  categories text[] DEFAULT '{}',
  lead_score integer DEFAULT 0,
  chef_relevance text CHECK (chef_relevance IN ('high', 'medium', 'low')),
  business_type text,
  ai_notes text,
  enriched_at timestamptz,
  classified_at timestamptz,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes for prospecting queries
CREATE INDEX IF NOT EXISTS idx_openclaw_leads_state ON openclaw_leads (state);
CREATE INDEX IF NOT EXISTS idx_openclaw_leads_city ON openclaw_leads (city);
CREATE INDEX IF NOT EXISTS idx_openclaw_leads_score ON openclaw_leads (lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_openclaw_leads_relevance ON openclaw_leads (chef_relevance) WHERE chef_relevance IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_openclaw_leads_state_score ON openclaw_leads (state, lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_openclaw_leads_categories ON openclaw_leads USING gin (categories);

-- Market stats by state (aggregated by enrichment pipeline)
CREATE TABLE IF NOT EXISTS openclaw_market_stats (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  state_code text NOT NULL UNIQUE,
  total_businesses integer DEFAULT 0,
  with_phone integer DEFAULT 0,
  with_email integer DEFAULT 0,
  with_website integer DEFAULT 0,
  categories jsonb DEFAULT '{}',
  high_value_count integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- RLS: openclaw tables are internal (service role only from Pi)
-- No tenant scoping needed since this is global prospecting data
ALTER TABLE openclaw_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE openclaw_market_stats ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so the Pi sync works.
-- For app access, add policies as needed when prospecting features use this data.
CREATE POLICY "Admins can read openclaw_leads"
  ON openclaw_leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.auth_user_id = auth.uid()
      AND user_roles.role = 'chef'
    )
  );

CREATE POLICY "Admins can read openclaw_market_stats"
  ON openclaw_market_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.auth_user_id = auth.uid()
      AND user_roles.role = 'chef'
    )
  );
