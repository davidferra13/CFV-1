-- Pantry Inventory: multi-location pantry tracking (Feature 3.16)
-- Chef home, client homes, storage units, etc.

-- =====================================================================================
-- TABLE: pantry_locations
-- =====================================================================================

CREATE TABLE pantry_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('home', 'client', 'storage', 'other')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pantry_locations_tenant ON pantry_locations(tenant_id);

-- =====================================================================================
-- TABLE: pantry_items
-- =====================================================================================

CREATE TABLE pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES pantry_locations(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT,
  category TEXT,
  expiry_date DATE,
  minimum_stock NUMERIC(10,2),
  notes TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_pantry_items_tenant_location ON pantry_items(tenant_id, location_id);
CREATE INDEX idx_pantry_items_tenant_ingredient ON pantry_items(tenant_id, ingredient_id);

-- =====================================================================================
-- RLS
-- =====================================================================================

ALTER TABLE pantry_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

-- pantry_locations policies
CREATE POLICY pantry_locations_select ON pantry_locations
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY pantry_locations_insert ON pantry_locations
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY pantry_locations_update ON pantry_locations
  FOR UPDATE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY pantry_locations_delete ON pantry_locations
  FOR DELETE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

-- pantry_items policies
CREATE POLICY pantry_items_select ON pantry_items
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY pantry_items_insert ON pantry_items
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY pantry_items_update ON pantry_items
  FOR UPDATE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY pantry_items_delete ON pantry_items
  FOR DELETE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
