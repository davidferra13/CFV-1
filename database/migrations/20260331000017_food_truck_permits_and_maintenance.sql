-- Food Truck: Permit Registry + Vehicle Maintenance Log
-- Additive migration - no destructive operations

-- ============================================
-- PERMITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name text NOT NULL,
  permit_type text NOT NULL CHECK (permit_type IN ('health', 'business', 'fire', 'parking', 'vendor', 'mobile_food', 'other')),
  issuing_authority text,
  permit_number text,
  issue_date date,
  expiry_date date NOT NULL,
  renewal_lead_days integer NOT NULL DEFAULT 30,
  cost_cents integer,
  notes text,
  document_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending_renewal', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_permits_tenant_expiry ON permits (tenant_id, expiry_date);
CREATE INDEX idx_permits_tenant_status ON permits (tenant_id, status);

ALTER TABLE permits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs can view own permits" ON permits;
CREATE POLICY "Chefs can view own permits"
  ON permits FOR SELECT
  USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

DROP POLICY IF EXISTS "Chefs can insert own permits" ON permits;
CREATE POLICY "Chefs can insert own permits"
  ON permits FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

DROP POLICY IF EXISTS "Chefs can update own permits" ON permits;
CREATE POLICY "Chefs can update own permits"
  ON permits FOR UPDATE
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

DROP POLICY IF EXISTS "Chefs can delete own permits" ON permits;
CREATE POLICY "Chefs can delete own permits"
  ON permits FOR DELETE
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

-- ============================================
-- VEHICLE MAINTENANCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vehicle_name text NOT NULL DEFAULT 'Primary Truck',
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('oil_change', 'tire_rotation', 'brake_service', 'engine', 'electrical', 'body_work', 'inspection', 'cleaning', 'other')),
  description text NOT NULL,
  date_performed date NOT NULL,
  next_due_date date,
  next_due_mileage integer,
  cost_cents integer NOT NULL DEFAULT 0,
  vendor_name text,
  odometer_reading integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_maintenance_tenant_due ON vehicle_maintenance (tenant_id, next_due_date);
CREATE INDEX idx_vehicle_maintenance_tenant_date ON vehicle_maintenance (tenant_id, date_performed);

ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs can view own vehicle maintenance" ON vehicle_maintenance;
CREATE POLICY "Chefs can view own vehicle maintenance"
  ON vehicle_maintenance FOR SELECT
  USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

DROP POLICY IF EXISTS "Chefs can insert own vehicle maintenance" ON vehicle_maintenance;
CREATE POLICY "Chefs can insert own vehicle maintenance"
  ON vehicle_maintenance FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

DROP POLICY IF EXISTS "Chefs can update own vehicle maintenance" ON vehicle_maintenance;
CREATE POLICY "Chefs can update own vehicle maintenance"
  ON vehicle_maintenance FOR UPDATE
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

DROP POLICY IF EXISTS "Chefs can delete own vehicle maintenance" ON vehicle_maintenance;
CREATE POLICY "Chefs can delete own vehicle maintenance"
  ON vehicle_maintenance FOR DELETE
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));
