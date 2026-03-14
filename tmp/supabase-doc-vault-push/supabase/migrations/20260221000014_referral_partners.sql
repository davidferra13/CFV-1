-- ============================================
-- REFERRAL PARTNERS & PUBLIC SHOWCASE
-- ============================================
-- Adds formal partner tracking (Airbnb hosts, hotels, businesses, etc.)
-- with locations, seasonal image galleries, and public showcase support.
--
-- Also links inquiries and events to partners for source analytics,
-- and adds a public profile slug to the chefs table.
--
-- FULLY ADDITIVE: No drops, no column modifications, no data at risk.
-- ============================================

-- ─── New Enums ──────────────────────────────

CREATE TYPE partner_type AS ENUM (
  'airbnb_host',
  'business',
  'platform',
  'individual',
  'venue',
  'other'
);
COMMENT ON TYPE partner_type IS 'Type of referral partner: airbnb_host, business (hotel/B&B/restaurant), platform (TakeAChef, etc.), individual (word-of-mouth), venue, other';
CREATE TYPE partner_status AS ENUM (
  'active',
  'inactive'
);
COMMENT ON TYPE partner_status IS 'Partner lifecycle: active partners appear in dropdowns, inactive are hidden but preserved for historical analytics';
-- ─── Referral Partners Table ────────────────

CREATE TABLE referral_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  partner_type partner_type NOT NULL DEFAULT 'individual',
  status partner_status NOT NULL DEFAULT 'active',

  -- Contact (internal use)
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Booking & Public Showcase
  booking_url TEXT,                              -- Link to partner's booking page (Airbnb listing, hotel site, etc.)
  description TEXT,                              -- Public-facing description for showcase
  cover_image_url TEXT,                          -- Hero/cover image for showcase
  is_showcase_visible BOOLEAN NOT NULL DEFAULT false,  -- Opt-in for public showcase page
  showcase_order INTEGER DEFAULT 0,              -- Display order on public page

  -- Internal notes (never public)
  notes TEXT,
  commission_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE referral_partners IS 'Referral partners (Airbnb hosts, hotels, businesses, platforms, individuals). Each partner is scoped to a chef tenant. Tracks both internal analytics and public showcase data.';
COMMENT ON COLUMN referral_partners.booking_url IS 'External booking link shown on public showcase (e.g., Airbnb listing URL)';
COMMENT ON COLUMN referral_partners.is_showcase_visible IS 'When true, partner appears on chef public profile showcase. When false, only visible internally.';
COMMENT ON COLUMN referral_partners.notes IS 'Internal relationship notes — never exposed publicly';
COMMENT ON COLUMN referral_partners.commission_notes IS 'Internal notes about referral arrangements — never exposed publicly';
-- Indexes
CREATE INDEX idx_referral_partners_tenant ON referral_partners(tenant_id);
CREATE INDEX idx_referral_partners_type ON referral_partners(tenant_id, partner_type);
CREATE INDEX idx_referral_partners_status ON referral_partners(tenant_id, status);
CREATE INDEX idx_referral_partners_showcase ON referral_partners(tenant_id, is_showcase_visible)
  WHERE is_showcase_visible = true;
-- Auto-update updated_at
CREATE TRIGGER referral_partners_updated_at
  BEFORE UPDATE ON referral_partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ─── Partner Locations Table ────────────────

CREATE TABLE partner_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES referral_partners(id) ON DELETE CASCADE,

  -- Location details
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Booking & Public
  booking_url TEXT,                              -- Location-specific booking link (overrides partner-level if set)
  description TEXT,                              -- Public-facing description

  -- Internal
  notes TEXT,                                    -- Kitchen notes, access, parking, etc. (not public)
  max_guest_count INTEGER,                       -- Capacity if known

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE partner_locations IS 'Sub-entities for multi-location partners. E.g., one Airbnb host with 4 properties. Optional — not all partners need locations.';
COMMENT ON COLUMN partner_locations.booking_url IS 'Location-specific booking link. If set, overrides the partner-level booking_url for this location.';
-- Indexes
CREATE INDEX idx_partner_locations_tenant ON partner_locations(tenant_id);
CREATE INDEX idx_partner_locations_partner ON partner_locations(partner_id);
-- Auto-update updated_at
CREATE TRIGGER partner_locations_updated_at
  BEFORE UPDATE ON partner_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ─── Partner Images Table ───────────────────

CREATE TABLE partner_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES referral_partners(id) ON DELETE CASCADE,
  location_id UUID REFERENCES partner_locations(id) ON DELETE CASCADE,  -- NULL = general partner image

  image_url TEXT NOT NULL,
  caption TEXT,
  season TEXT,                                   -- 'spring', 'summer', 'fall', 'winter', or NULL for all-season
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE partner_images IS 'Photo gallery for partners and locations. Images can be tagged by season for seasonal showcase displays.';
COMMENT ON COLUMN partner_images.location_id IS 'If set, image belongs to this specific location. If NULL, it is a general partner image.';
COMMENT ON COLUMN partner_images.season IS 'Optional seasonal tag: spring, summer, fall, winter. NULL means all-season.';
-- Indexes
CREATE INDEX idx_partner_images_partner ON partner_images(partner_id);
CREATE INDEX idx_partner_images_location ON partner_images(partner_id, location_id);
CREATE INDEX idx_partner_images_season ON partner_images(partner_id, season);
-- ─── ALTER: inquiries ───────────────────────

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS referral_partner_id UUID REFERENCES referral_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_location_id UUID REFERENCES partner_locations(id) ON DELETE SET NULL;
CREATE INDEX idx_inquiries_referral_partner ON inquiries(referral_partner_id)
  WHERE referral_partner_id IS NOT NULL;
CREATE INDEX idx_inquiries_partner_location ON inquiries(partner_location_id)
  WHERE partner_location_id IS NOT NULL;
COMMENT ON COLUMN inquiries.referral_partner_id IS 'Which partner referred this inquiry (orthogonal to channel — channel is HOW they reached out, partner is WHO sent them)';
COMMENT ON COLUMN inquiries.partner_location_id IS 'Which specific partner location this inquiry is associated with (optional)';
-- ─── ALTER: events ──────────────────────────

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS referral_partner_id UUID REFERENCES referral_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_location_id UUID REFERENCES partner_locations(id) ON DELETE SET NULL;
CREATE INDEX idx_events_referral_partner ON events(referral_partner_id)
  WHERE referral_partner_id IS NOT NULL;
CREATE INDEX idx_events_partner_location ON events(partner_location_id)
  WHERE partner_location_id IS NOT NULL;
COMMENT ON COLUMN events.referral_partner_id IS 'Which partner referred this event. Propagated from inquiry on conversion, or set directly for non-inquiry events.';
COMMENT ON COLUMN events.partner_location_id IS 'Which specific partner location this event is at (optional)';
-- ─── ALTER: chefs (public profile) ──────────

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS tagline TEXT;
COMMENT ON COLUMN chefs.slug IS 'URL-safe slug for public chef profile page (e.g., chef-david → /chef/chef-david). Unique across all chefs.';
COMMENT ON COLUMN chefs.tagline IS 'Short subtitle shown on public profile hero section';
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- ─── referral_partners RLS ──────────────────

ALTER TABLE referral_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY referral_partners_chef_select ON referral_partners
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
CREATE POLICY referral_partners_chef_insert ON referral_partners
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
CREATE POLICY referral_partners_chef_update ON referral_partners
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
CREATE POLICY referral_partners_chef_delete ON referral_partners
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- ─── partner_locations RLS ──────────────────

ALTER TABLE partner_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY partner_locations_chef_select ON partner_locations
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
CREATE POLICY partner_locations_chef_insert ON partner_locations
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
CREATE POLICY partner_locations_chef_update ON partner_locations
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
CREATE POLICY partner_locations_chef_delete ON partner_locations
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- ─── partner_images RLS ─────────────────────

ALTER TABLE partner_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY partner_images_chef_select ON partner_images
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
CREATE POLICY partner_images_chef_insert ON partner_images
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
CREATE POLICY partner_images_chef_update ON partner_images
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
CREATE POLICY partner_images_chef_delete ON partner_images
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- ============================================
-- NOTE: Public showcase uses admin client
-- (createServerClient({ admin: true })) to bypass
-- RLS, same pattern as event share pages.
-- No anon policies needed.
-- ============================================;
