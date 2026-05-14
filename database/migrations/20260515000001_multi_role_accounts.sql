-- 20260515000001_multi_role_accounts.sql
-- Multi-Role Account System: allow one person to hold multiple roles
-- SAFETY: All operations are additive. No data loss. No column drops.

BEGIN;

-- 1. Drop the single-role constraint
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_auth_user_id_key;

-- 2. Drop the old unique index (it enforced single-role)
DROP INDEX IF EXISTS idx_user_roles_auth_user;

-- 3. Add composite unique: prevent duplicate role+entity for same user
ALTER TABLE user_roles ADD CONSTRAINT user_roles_auth_entity_unique
  UNIQUE (auth_user_id, role, entity_id);

-- 4. Add index for fast lookup by auth_user_id (replaces old unique index)
CREATE INDEX idx_user_roles_auth_user ON user_roles (auth_user_id);

-- 5. Add new role enum values
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'vendor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'guest';

-- 6. Create vendor_invitations table (mirrors client_invitations pattern)
CREATE TABLE vendor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(token)
);

-- RLS for vendor_invitations: chefs manage their own
ALTER TABLE vendor_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_invitations_chef_all ON vendor_invitations
  FOR ALL TO public
  USING (tenant_id = get_current_tenant_id());

-- 7. Create guest_profiles table (stable identity for ticket purchasers)
CREATE TABLE guest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  dietary_restrictions TEXT[] DEFAULT '{}',
  allergens TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_guest_profiles_email ON guest_profiles (lower(email));

ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;

-- Guests can read their own profile
CREATE POLICY guest_profiles_self_select ON guest_profiles
  FOR SELECT TO public
  USING (id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'guest'
  ));

-- Guests can update their own profile
CREATE POLICY guest_profiles_self_update ON guest_profiles
  FOR UPDATE TO public
  USING (id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'guest'
  ));

-- 8. Add vendor RLS policies for vendor-role users
-- Purchase orders: vendor can see their own
CREATE POLICY po_vendor_select ON purchase_orders
  FOR SELECT TO public
  USING (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

-- Purchase orders: vendor can update status (acknowledge, mark shipped)
CREATE POLICY po_vendor_update ON purchase_orders
  FOR UPDATE TO public
  USING (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

-- Vendor invoices: vendor can see and create their own
CREATE POLICY vi_vendor_select ON vendor_invoices
  FOR SELECT TO public
  USING (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

CREATE POLICY vi_vendor_insert ON vendor_invoices
  FOR INSERT TO public
  WITH CHECK (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

-- Vendor items: vendor can see and update their catalog
CREATE POLICY vitems_vendor_select ON vendor_items
  FOR SELECT TO public
  USING (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

CREATE POLICY vitems_vendor_update ON vendor_items
  FOR UPDATE TO public
  USING (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

-- Vendor price points: vendor can see their own
CREATE POLICY vpp_vendor_select ON vendor_price_points
  FOR SELECT TO public
  USING (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

COMMIT;
