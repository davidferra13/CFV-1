-- Harden public chef locations into a normalized experience layer.
-- Extends partner_locations with structured metadata and adds a chef<->location link table
-- for relationship/public ordering without breaking the existing partner/location system.

ALTER TABLE partner_locations
  ADD COLUMN IF NOT EXISTS experience_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS best_for TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS service_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN partner_locations.description IS
  'Public client-facing notes for this location experience.';
COMMENT ON COLUMN partner_locations.notes IS
  'Private chef-only intelligence for this location.';
COMMENT ON COLUMN partner_locations.experience_tags IS
  'Structured media/context tags for discovery and display, such as food, outdoor, plated, event, and seasonal.';
COMMENT ON COLUMN partner_locations.best_for IS
  'Structured experience fit tags for this setting.';
COMMENT ON COLUMN partner_locations.service_types IS
  'Structured formats the chef can deliver at this setting.';

CREATE TABLE IF NOT EXISTS chef_location_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES partner_locations(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'preferred',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chef_location_links_relationship_type_check
    CHECK (relationship_type IN ('preferred', 'exclusive', 'featured', 'available_on_request')),
  CONSTRAINT chef_location_links_unique_chef_location UNIQUE (chef_id, location_id)
);

COMMENT ON TABLE chef_location_links IS
  'Normalized chef<->location relationship metadata for public discovery, ordering, and attribution.';
COMMENT ON COLUMN chef_location_links.relationship_type IS
  'How the chef publicly relates to this location.';

CREATE INDEX IF NOT EXISTS idx_chef_location_links_chef_public
  ON chef_location_links(chef_id, is_public, sort_order);
CREATE INDEX IF NOT EXISTS idx_chef_location_links_location
  ON chef_location_links(location_id);
CREATE INDEX IF NOT EXISTS idx_partner_locations_experience_tags
  ON partner_locations USING GIN (experience_tags);
CREATE INDEX IF NOT EXISTS idx_partner_locations_best_for
  ON partner_locations USING GIN (best_for);
CREATE INDEX IF NOT EXISTS idx_partner_locations_service_types
  ON partner_locations USING GIN (service_types);

INSERT INTO chef_location_links (
  tenant_id,
  chef_id,
  location_id,
  relationship_type,
  is_public,
  is_featured,
  sort_order
)
SELECT
  location.tenant_id,
  location.tenant_id,
  location.id,
  'preferred',
  TRUE,
  TRUE,
  COALESCE(location.max_guest_count, 0)
FROM partner_locations AS location
ON CONFLICT (chef_id, location_id) DO NOTHING;

ALTER TABLE chef_location_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chef_location_links_chef_select ON chef_location_links;
CREATE POLICY chef_location_links_chef_select ON chef_location_links
  FOR SELECT
  TO public
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS chef_location_links_chef_insert ON chef_location_links;
CREATE POLICY chef_location_links_chef_insert ON chef_location_links
  FOR INSERT
  TO public
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS chef_location_links_chef_update ON chef_location_links;
CREATE POLICY chef_location_links_chef_update ON chef_location_links
  FOR UPDATE
  TO public
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS chef_location_links_chef_delete ON chef_location_links;
CREATE POLICY chef_location_links_chef_delete ON chef_location_links
  FOR DELETE
  TO public
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
