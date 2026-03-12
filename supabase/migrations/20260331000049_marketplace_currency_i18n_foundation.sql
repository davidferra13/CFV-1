-- Marketplace + Multi-Currency + i18n Foundation
-- Adds: marketplace_profiles, marketplace_client_links, chef_marketplace_profiles
-- Adds: preferred_currency/preferred_locale on chefs, currency_code on ledger_entries

-- ============================================================================
-- 1. Chef currency & locale preferences
-- ============================================================================

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT NOT NULL DEFAULT 'en-US';

-- ============================================================================
-- 2. Ledger entries: record currency per entry
-- ============================================================================

ALTER TABLE ledger_entries
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS exchange_rate_to_base NUMERIC(12,6) DEFAULT 1.0;

-- ============================================================================
-- 3. Marketplace profiles (cross-tenant client identity)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,

  -- Marketplace preferences
  preferred_cuisines TEXT[] DEFAULT '{}',
  dietary_restrictions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  default_location_city TEXT,
  default_location_state TEXT,
  discovery_radius_miles INTEGER DEFAULT 50,

  -- Link to legacy single-tenant client
  primary_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Link to dinner circle hub profile (if exists)
  hub_profile_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_marketplace_profiles_email
  ON marketplace_profiles(email);

CREATE INDEX IF NOT EXISTS idx_marketplace_profiles_primary_client
  ON marketplace_profiles(primary_client_id)
  WHERE primary_client_id IS NOT NULL;

-- ============================================================================
-- 4. Marketplace client links (one profile -> N tenant-scoped clients)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_client_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_profile_id UUID NOT NULL REFERENCES marketplace_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Relationship metadata
  first_inquiry_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ,
  total_events INTEGER NOT NULL DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT marketplace_client_links_profile_tenant_unique
    UNIQUE (marketplace_profile_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_client_links_client
  ON marketplace_client_links(client_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_client_links_tenant
  ON marketplace_client_links(tenant_id);

-- ============================================================================
-- 5. Chef marketplace profiles (enriched public search data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chef_marketplace_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL UNIQUE REFERENCES chefs(id) ON DELETE CASCADE,

  -- Searchable attributes
  cuisine_types TEXT[] DEFAULT '{}',
  service_types TEXT[] DEFAULT '{}',
  price_range TEXT, -- 'budget', 'mid', 'premium', 'luxury'

  min_guest_count INTEGER,
  max_guest_count INTEGER,
  service_area_city TEXT,
  service_area_state TEXT,
  service_area_radius_miles INTEGER DEFAULT 25,

  -- Computed review data (updated by triggers/cron)
  avg_rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,

  -- Availability signals
  accepting_inquiries BOOLEAN NOT NULL DEFAULT true,
  next_available_date DATE,
  lead_time_days INTEGER DEFAULT 3,

  -- Rich profile content
  hero_image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  highlight_text TEXT,

  -- Full-text search
  searchable_text TSVECTOR,

  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_chef_marketplace_profiles_search
  ON chef_marketplace_profiles USING GIN (searchable_text);

CREATE INDEX IF NOT EXISTS idx_chef_marketplace_profiles_location
  ON chef_marketplace_profiles(service_area_state, service_area_city);

CREATE INDEX IF NOT EXISTS idx_chef_marketplace_profiles_accepting
  ON chef_marketplace_profiles(accepting_inquiries)
  WHERE accepting_inquiries = true;

-- ============================================================================
-- 6. Updated_at triggers
-- ============================================================================

DROP TRIGGER IF EXISTS trg_marketplace_profiles_updated_at ON marketplace_profiles;
CREATE TRIGGER trg_marketplace_profiles_updated_at
  BEFORE UPDATE ON marketplace_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_marketplace_client_links_updated_at ON marketplace_client_links;
CREATE TRIGGER trg_marketplace_client_links_updated_at
  BEFORE UPDATE ON marketplace_client_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_chef_marketplace_profiles_updated_at ON chef_marketplace_profiles;
CREATE TRIGGER trg_chef_marketplace_profiles_updated_at
  BEFORE UPDATE ON chef_marketplace_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. RLS policies
-- ============================================================================

ALTER TABLE marketplace_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_client_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_marketplace_profiles ENABLE ROW LEVEL SECURITY;

-- Marketplace profiles: users can read/update their own
DROP POLICY IF EXISTS "Users manage own marketplace profile" ON marketplace_profiles;
CREATE POLICY "Users manage own marketplace profile"
  ON marketplace_profiles
  FOR ALL
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Service role full access
DROP POLICY IF EXISTS "Service role manages marketplace profiles" ON marketplace_profiles;
CREATE POLICY "Service role manages marketplace profiles"
  ON marketplace_profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Marketplace client links: readable by owning client OR owning chef
DROP POLICY IF EXISTS "Clients read own marketplace links" ON marketplace_client_links;
CREATE POLICY "Clients read own marketplace links"
  ON marketplace_client_links
  FOR SELECT
  USING (
    marketplace_profile_id IN (
      SELECT id FROM marketplace_profiles WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Chefs read own tenant marketplace links" ON marketplace_client_links;
CREATE POLICY "Chefs read own tenant marketplace links"
  ON marketplace_client_links
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS "Service role manages marketplace client links" ON marketplace_client_links;
CREATE POLICY "Service role manages marketplace client links"
  ON marketplace_client_links
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Chef marketplace profiles: public read, chef write
DROP POLICY IF EXISTS "Public reads chef marketplace profiles" ON chef_marketplace_profiles;
CREATE POLICY "Public reads chef marketplace profiles"
  ON chef_marketplace_profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Chefs manage own marketplace profile" ON chef_marketplace_profiles;
CREATE POLICY "Chefs manage own marketplace profile"
  ON chef_marketplace_profiles
  FOR ALL
  USING (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS "Service role manages chef marketplace profiles" ON chef_marketplace_profiles;
CREATE POLICY "Service role manages chef marketplace profiles"
  ON chef_marketplace_profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
