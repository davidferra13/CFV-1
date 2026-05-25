-- Client Intelligence Capture: new columns on clients + event_references table
-- All additive. Zero risk. Every new column is nullable.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS household_size INTEGER,
  ADD COLUMN IF NOT EXISTS children_ages TEXT,
  ADD COLUMN IF NOT EXISTS lifestyle_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lifestyle_notes TEXT,
  ADD COLUMN IF NOT EXISTS company_role TEXT,
  ADD COLUMN IF NOT EXISTS company_industry TEXT,
  ADD COLUMN IF NOT EXISTS company_notes TEXT,
  ADD COLUMN IF NOT EXISTS kitchen_quality TEXT CHECK (kitchen_quality IS NULL OR kitchen_quality IN ('basic', 'decent', 'well_equipped', 'professional')),
  ADD COLUMN IF NOT EXISTS neighborhood_notes TEXT,
  ADD COLUMN IF NOT EXISTS map_link TEXT;

COMMENT ON COLUMN clients.household_size IS 'Total people in household. Affects portion planning.';
COMMENT ON COLUMN clients.children_ages IS 'Free text ages/descriptions. Affects kid-friendly menu choices.';
COMMENT ON COLUMN clients.lifestyle_tags IS 'Array of lifestyle tags: health_conscious, foodie, entertainer, etc.';
COMMENT ON COLUMN clients.lifestyle_notes IS 'Free text lifestyle context from social media research.';
COMMENT ON COLUMN clients.company_role IS 'Job title at company_name. For corporate event context.';
COMMENT ON COLUMN clients.company_industry IS 'Industry sector. Affects corporate event expectations.';
COMMENT ON COLUMN clients.company_notes IS 'Chef-only. Corporate culture, size, event history notes.';
COMMENT ON COLUMN clients.kitchen_quality IS 'Quick assessment: basic/decent/well_equipped/professional.';
COMMENT ON COLUMN clients.neighborhood_notes IS 'Parking, access, gated community, street notes. Chef-only.';
COMMENT ON COLUMN clients.map_link IS 'Google Maps or Street View URL for quick navigation.';

-- Event reference pinning table
CREATE TABLE IF NOT EXISTS event_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ref_type TEXT NOT NULL CHECK (ref_type IN ('url', 'image', 'file')),
  url TEXT,
  storage_path TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('inspiration', 'venue', 'theme', 'brand_guidelines', 'client_reference', 'menu_reference', 'general')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_references_event ON event_references(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_references_tenant ON event_references(tenant_id, created_at DESC);
