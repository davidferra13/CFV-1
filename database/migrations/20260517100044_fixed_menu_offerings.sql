-- Fixed Menu Offerings: bookable menu products on a chef's storefront
-- ADDITIVE ONLY: no drops, no deletes, no column renames

-- menu_offerings: each row turns a menu into a purchasable product
CREATE TABLE IF NOT EXISTS menu_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,

  -- Pricing
  price_per_head_cents INTEGER NOT NULL,
  min_guests INTEGER NOT NULL DEFAULT 2,
  max_guests INTEGER NOT NULL DEFAULT 20,

  -- Availability
  available_seasons TEXT[] NOT NULL DEFAULT ARRAY['all_season'],
  available_days_of_week INTEGER[] DEFAULT NULL,
  booking_lead_time_days INTEGER NOT NULL DEFAULT 7,
  active BOOLEAN NOT NULL DEFAULT true,

  -- Display
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  tagline TEXT,
  hero_image_url TEXT,
  description TEXT,

  -- Tracking
  view_count INTEGER NOT NULL DEFAULT 0,
  booking_count INTEGER NOT NULL DEFAULT 0,
  last_booked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  UNIQUE(tenant_id, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menu_offerings_tenant_active
  ON menu_offerings(tenant_id) WHERE active = true AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_menu_offerings_menu
  ON menu_offerings(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_offerings_season
  ON menu_offerings USING GIN(available_seasons);

-- offering_bookings: tracks each booking against an offering (analytics + "the usual")
CREATE TABLE IF NOT EXISTS offering_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID NOT NULL REFERENCES menu_offerings(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  guest_count INTEGER NOT NULL,
  price_per_head_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,

  UNIQUE(event_id)
);

CREATE INDEX IF NOT EXISTS idx_offering_bookings_client
  ON offering_bookings(client_id, booked_at DESC);
CREATE INDEX IF NOT EXISTS idx_offering_bookings_offering
  ON offering_bookings(offering_id, booked_at DESC);
