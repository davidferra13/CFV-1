-- Client Kitchen Inventory & Chef Equipment Master
-- Tracks what equipment each client's kitchen has, and what the chef owns/can bring.
-- Enables packing list generation (gap analysis between client kitchen and chef equipment).

-- Category enum shared by both tables
CREATE TYPE kitchen_item_category AS ENUM (
  'cookware', 'appliance', 'utensil', 'storage', 'servingware', 'other'
);

-- Condition enum for client kitchen items
CREATE TYPE kitchen_item_condition AS ENUM (
  'good', 'fair', 'poor', 'missing'
);

-- ─── Client Kitchen Inventory ─────────────────────────────────────────────────

CREATE TABLE client_kitchen_inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category    kitchen_item_category NOT NULL DEFAULT 'other',
  item_name   TEXT NOT NULL,
  quantity    INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  condition   kitchen_item_condition NOT NULL DEFAULT 'good',
  notes       TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_client_kitchen_inventory_tenant ON client_kitchen_inventory(tenant_id);
CREATE INDEX idx_client_kitchen_inventory_client ON client_kitchen_inventory(client_id);
CREATE INDEX idx_client_kitchen_inventory_category ON client_kitchen_inventory(category);

-- RLS
ALTER TABLE client_kitchen_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON client_kitchen_inventory
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

-- ─── Chef Equipment Master ───────────────────────────────────────────────────

CREATE TABLE chef_equipment_master (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  category    kitchen_item_category NOT NULL DEFAULT 'other',
  item_name   TEXT NOT NULL,
  quantity    INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  is_portable BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_chef_equipment_master_tenant ON chef_equipment_master(tenant_id);
CREATE INDEX idx_chef_equipment_master_category ON chef_equipment_master(category);

-- RLS
ALTER TABLE chef_equipment_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON chef_equipment_master
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
