-- Table-service foundation: dining zones, tables, and open checks (tabs).

DO $$ BEGIN
  CREATE TYPE commerce_dining_table_status AS ENUM (
    'available',
    'seated',
    'reserved',
    'out_of_service'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE commerce_dining_check_status AS ENUM ('open', 'closed', 'voided');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS commerce_dining_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commerce_dining_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES commerce_dining_zones(id) ON DELETE CASCADE,
  table_label TEXT NOT NULL,
  seat_capacity INTEGER NOT NULL CHECK (seat_capacity >= 1 AND seat_capacity <= 30),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status commerce_dining_table_status NOT NULL DEFAULT 'available',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commerce_dining_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES commerce_dining_tables(id) ON DELETE RESTRICT,
  register_session_id UUID REFERENCES register_sessions(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  status commerce_dining_check_status NOT NULL DEFAULT 'open',
  guest_name TEXT,
  guest_count INTEGER CHECK (guest_count IS NULL OR (guest_count >= 1 AND guest_count <= 30)),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_dining_zones_tenant_name
  ON commerce_dining_zones (tenant_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_dining_tables_tenant_label
  ON commerce_dining_tables (tenant_id, table_label);

CREATE INDEX IF NOT EXISTS idx_commerce_dining_tables_tenant_zone_sort
  ON commerce_dining_tables (tenant_id, zone_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_commerce_dining_tables_tenant_status
  ON commerce_dining_tables (tenant_id, status, is_active);

CREATE INDEX IF NOT EXISTS idx_commerce_dining_checks_tenant_opened
  ON commerce_dining_checks (tenant_id, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_commerce_dining_checks_tenant_status
  ON commerce_dining_checks (tenant_id, status, opened_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_dining_checks_one_open_per_table
  ON commerce_dining_checks (tenant_id, table_id)
  WHERE status = 'open';

DROP TRIGGER IF EXISTS update_commerce_dining_zones_updated_at ON commerce_dining_zones;
CREATE TRIGGER update_commerce_dining_zones_updated_at
  BEFORE UPDATE ON commerce_dining_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_commerce_dining_tables_updated_at ON commerce_dining_tables;
CREATE TRIGGER update_commerce_dining_tables_updated_at
  BEFORE UPDATE ON commerce_dining_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_commerce_dining_checks_updated_at ON commerce_dining_checks;
CREATE TRIGGER update_commerce_dining_checks_updated_at
  BEFORE UPDATE ON commerce_dining_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE commerce_dining_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_dining_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commerce_dining_zones_chef_all ON commerce_dining_zones;
CREATE POLICY commerce_dining_zones_chef_all ON commerce_dining_zones
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS commerce_dining_tables_chef_all ON commerce_dining_tables;
CREATE POLICY commerce_dining_tables_chef_all ON commerce_dining_tables
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS commerce_dining_checks_chef_all ON commerce_dining_checks;
CREATE POLICY commerce_dining_checks_chef_all ON commerce_dining_checks
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS commerce_dining_zones_service_all ON commerce_dining_zones;
CREATE POLICY commerce_dining_zones_service_all ON commerce_dining_zones
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS commerce_dining_tables_service_all ON commerce_dining_tables;
CREATE POLICY commerce_dining_tables_service_all ON commerce_dining_tables
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS commerce_dining_checks_service_all ON commerce_dining_checks;
CREATE POLICY commerce_dining_checks_service_all ON commerce_dining_checks
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE commerce_dining_zones IS 'Dining room zone/floor-plan groupings for table service.';
COMMENT ON TABLE commerce_dining_tables IS 'Physical tables used for dine-in service and open checks.';
COMMENT ON TABLE commerce_dining_checks IS 'Open and closed dine-in checks (tabs) linked to POS sales.';
