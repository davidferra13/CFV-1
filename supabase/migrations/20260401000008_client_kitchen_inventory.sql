-- Client Kitchen Inventory & Chef Equipment Master
-- Tracks what equipment each client's kitchen has, and what the chef owns/can bring.
-- Enables packing list generation (gap analysis between client kitchen and chef equipment).

-- Category enum shared by both tables
DO $$ BEGIN
  CREATE TYPE kitchen_item_category AS ENUM (
  'cookware', 'appliance', 'utensil', 'storage', 'servingware', 'other'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Condition enum for client kitchen items
DO $$ BEGIN
  CREATE TYPE kitchen_item_condition AS ENUM (
  'good', 'fair', 'poor', 'missing'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Client Kitchen Inventory ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_kitchen_inventory (
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
CREATE INDEX IF NOT EXISTS idx_client_kitchen_inventory_tenant ON client_kitchen_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_kitchen_inventory_client ON client_kitchen_inventory(client_id);
CREATE INDEX IF NOT EXISTS idx_client_kitchen_inventory_category ON client_kitchen_inventory(category);

-- RLS
ALTER TABLE client_kitchen_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON client_kitchen_inventory;
CREATE POLICY "tenant_isolation" ON client_kitchen_inventory
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

-- ─── Chef Equipment Master ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chef_equipment_master (
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
CREATE INDEX IF NOT EXISTS idx_chef_equipment_master_tenant ON chef_equipment_master(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_equipment_master_category ON chef_equipment_master(category);

-- RLS
ALTER TABLE chef_equipment_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON chef_equipment_master;
CREATE POLICY "tenant_isolation" ON chef_equipment_master
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
