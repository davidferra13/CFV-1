-- Experience Packages: bundles with dynamic pricing
-- Allows chefs to create reusable service packages (dinner party, meal prep, etc.)
-- with configurable base pricing, seasonal multipliers, guest tiers, and add-ons.

CREATE TABLE IF NOT EXISTS experience_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  package_type text NOT NULL CHECK (package_type IN ('dinner_party', 'meal_prep', 'cooking_class', 'tasting_menu', 'custom')),
  base_price_cents int NOT NULL,
  includes text[] DEFAULT '{}',
  add_ons jsonb DEFAULT '[]',
  min_guests int DEFAULT 1,
  max_guests int,
  duration_hours numeric(4,1),
  cuisine_types text[],
  menu_id uuid REFERENCES menus(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  seasonal_pricing jsonb,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_experience_packages_tenant ON experience_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_experience_packages_type ON experience_packages(tenant_id, package_type);
CREATE INDEX IF NOT EXISTS idx_experience_packages_active ON experience_packages(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_experience_packages_menu ON experience_packages(menu_id);

-- RLS
ALTER TABLE experience_packages ENABLE ROW LEVEL SECURITY;

-- Chefs can manage their own packages
CREATE POLICY "experience_packages_chef_select"
  ON experience_packages FOR SELECT
  USING (tenant_id = (SELECT ur.entity_id FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef' LIMIT 1));

CREATE POLICY "experience_packages_chef_insert"
  ON experience_packages FOR INSERT
  WITH CHECK (tenant_id = (SELECT ur.entity_id FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef' LIMIT 1));

CREATE POLICY "experience_packages_chef_update"
  ON experience_packages FOR UPDATE
  USING (tenant_id = (SELECT ur.entity_id FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef' LIMIT 1));

CREATE POLICY "experience_packages_chef_delete"
  ON experience_packages FOR DELETE
  USING (tenant_id = (SELECT ur.entity_id FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef' LIMIT 1));

-- Public read for active packages (used by public-facing package listings)
CREATE POLICY "experience_packages_public_read"
  ON experience_packages FOR SELECT
  USING (is_active = true);

-- Comment on seasonal_pricing and add_ons format
COMMENT ON COLUMN experience_packages.seasonal_pricing IS 'JSON multipliers by season key, e.g. {"summer": 1.1, "holiday": 1.25, "off_peak": 0.9}';
COMMENT ON COLUMN experience_packages.add_ons IS 'JSON array of add-on objects, e.g. [{"name": "Wine Pairing", "price_cents": 2500, "per_person": true}]';
