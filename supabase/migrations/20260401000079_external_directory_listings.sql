-- External Directory Listings
-- Stores discovered and submitted food businesses (restaurants, food trucks, bakeries, etc.)
-- that are NOT ChefFlow platform users. These are outbound-link directory entries.
--
-- Phase 1 (Discovered): name, city, cuisine_types, website_url only
-- Phase 2 (Claimed/Verified): full details populated by the business owner

CREATE TABLE IF NOT EXISTS directory_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (Phase 1 - auto-populated from public data)
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  city text,
  neighborhood text,
  state text,
  cuisine_types text[] NOT NULL DEFAULT '{}',
  business_type text NOT NULL DEFAULT 'restaurant',
  website_url text,

  -- Status lifecycle: discovered -> claimed -> verified | removed
  status text NOT NULL DEFAULT 'discovered'
    CHECK (status IN ('discovered', 'pending_submission', 'claimed', 'verified', 'removed')),

  -- Enriched details (Phase 2 - populated after claim/submission)
  address text,
  phone text,
  email text,
  description text,
  hours jsonb,
  photo_urls text[] NOT NULL DEFAULT '{}',
  menu_url text,
  price_range text CHECK (price_range IS NULL OR price_range IN ('$', '$$', '$$$', '$$$$')),

  -- Source tracking
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'openstreetmap', 'submission', 'community_nomination')),
  source_id text,

  -- Claim tracking
  claimed_by_name text,
  claimed_by_email text,
  claimed_at timestamptz,
  claim_token uuid,

  -- Removal
  removal_requested_at timestamptz,
  removal_reason text,
  removed_at timestamptz,

  -- SEO & display
  featured boolean NOT NULL DEFAULT false,
  feature_order int,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_directory_listings_status ON directory_listings(status) WHERE status != 'removed';
CREATE INDEX IF NOT EXISTS idx_directory_listings_business_type ON directory_listings(business_type);
CREATE INDEX IF NOT EXISTS idx_directory_listings_city ON directory_listings(city);
CREATE INDEX IF NOT EXISTS idx_directory_listings_state ON directory_listings(state);
CREATE INDEX IF NOT EXISTS idx_directory_listings_slug ON directory_listings(slug);
CREATE INDEX IF NOT EXISTS idx_directory_listings_cuisine_types ON directory_listings USING gin(cuisine_types);
CREATE INDEX IF NOT EXISTS idx_directory_listings_featured ON directory_listings(featured, feature_order) WHERE featured = true;

-- Nominations table for community suggestions
CREATE TABLE IF NOT EXISTS directory_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES directory_listings(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  business_type text NOT NULL DEFAULT 'restaurant',
  city text,
  state text,
  website_url text,
  nominator_name text,
  nominator_email text,
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_directory_nominations_status ON directory_nominations(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_directory_listing_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_directory_listings_updated_at ON directory_listings;
CREATE TRIGGER trg_directory_listings_updated_at
  BEFORE UPDATE ON directory_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_directory_listing_updated_at();

-- RLS: Public read for non-removed listings, admin write
ALTER TABLE directory_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_nominations ENABLE ROW LEVEL SECURITY;

-- Anyone can read active listings (public directory)
DROP POLICY IF EXISTS "directory_listings_public_read" ON directory_listings;
CREATE POLICY "directory_listings_public_read" ON directory_listings
  FOR SELECT USING (status != 'removed');

-- Only service_role can insert/update/delete (admin actions via server)
DROP POLICY IF EXISTS "directory_listings_admin_write" ON directory_listings;
CREATE POLICY "directory_listings_admin_write" ON directory_listings
  FOR ALL USING (auth.role() = 'service_role');

-- Anyone can submit nominations
DROP POLICY IF EXISTS "directory_nominations_public_insert" ON directory_nominations;
CREATE POLICY "directory_nominations_public_insert" ON directory_nominations
  FOR INSERT WITH CHECK (true);

-- Only service_role can read/update nominations
DROP POLICY IF EXISTS "directory_nominations_admin_manage" ON directory_nominations;
CREATE POLICY "directory_nominations_admin_manage" ON directory_nominations
  FOR ALL USING (auth.role() = 'service_role');
