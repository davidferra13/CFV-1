-- RBAC Foundation Migration
-- Adds tenant_role column to user_roles, creates role_permissions (seeded defaults),
-- user_permission_overrides, permission_audit_log, and owner protection trigger.
-- All changes are ADDITIVE. No existing columns or tables are modified or dropped.

-- ─── 1. Add tenant_role to user_roles ───────────────────────────────────────────

ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS tenant_role TEXT DEFAULT 'team_member';

-- Backfill from existing role column
UPDATE user_roles SET tenant_role = CASE
  WHEN role = 'chef' THEN 'tenant_owner'
  WHEN role = 'client' THEN 'client'
  WHEN role = 'staff' THEN 'team_member'
  WHEN role = 'partner' THEN 'partner'
  ELSE 'team_member'
END
WHERE tenant_role IS NULL OR tenant_role = 'team_member';

-- Re-backfill chef specifically (the UPDATE above may have already set it,
-- but this ensures correctness for the chef case since 'team_member' is the default)
UPDATE user_roles SET tenant_role = 'tenant_owner' WHERE role = 'chef';

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_tenant_role_check
  CHECK (tenant_role IN ('tenant_owner', 'manager', 'team_member', 'client', 'partner'));

-- ─── 2. Role default permissions (seeded, read-only reference) ──────────────────

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  domain TEXT NOT NULL,
  actions TEXT[] NOT NULL DEFAULT '{}',
  scope TEXT NOT NULL DEFAULT 'tenant',
  UNIQUE(role, domain)
);

-- Seed tenant_owner (full access to everything)
INSERT INTO role_permissions (role, domain, actions, scope) VALUES
  ('tenant_owner', 'events',       ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'clients',      ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'quotes',       ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'financial',    ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'recipes',      ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'inventory',    ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'staff',        ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'documents',    ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'calendar',     ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'comms',        ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'analytics',    ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'settings',     ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'billing',      ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'ai',           ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'community',    ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'users',        ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'data',         ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('tenant_owner', 'integrations', ARRAY['view','create','edit','delete','manage'], 'tenant')
ON CONFLICT (role, domain) DO NOTHING;

-- Seed manager (broad access, no billing/destructive account ops)
INSERT INTO role_permissions (role, domain, actions, scope) VALUES
  ('manager', 'events',       ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('manager', 'clients',      ARRAY['view','create','edit'],                  'tenant'),
  ('manager', 'quotes',       ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('manager', 'financial',    ARRAY['view'],                                  'tenant'),
  ('manager', 'recipes',      ARRAY['view','create','edit'],                  'tenant'),
  ('manager', 'inventory',    ARRAY['view','create','edit'],                  'tenant'),
  ('manager', 'staff',        ARRAY['view','create','edit'],                  'tenant'),
  ('manager', 'documents',    ARRAY['view','create','edit'],                  'tenant'),
  ('manager', 'calendar',     ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('manager', 'comms',        ARRAY['view','create','edit'],                  'tenant'),
  ('manager', 'analytics',    ARRAY['view'],                                  'tenant'),
  ('manager', 'settings',     ARRAY['view'],                                  'tenant'),
  ('manager', 'ai',           ARRAY['view','create','edit','manage'],         'tenant'),
  ('manager', 'community',    ARRAY['view'],                                  'tenant'),
  ('manager', 'users',        ARRAY['view','create','edit'],                  'tenant'),
  ('manager', 'data',         ARRAY['view','create','edit','delete','manage'], 'tenant'),
  ('manager', 'integrations', ARRAY['view'],                                  'tenant')
ON CONFLICT (role, domain) DO NOTHING;

-- Seed team_member (task-focused defaults)
INSERT INTO role_permissions (role, domain, actions, scope) VALUES
  ('team_member', 'events',       ARRAY['view'],          'tenant'),
  ('team_member', 'clients',      ARRAY['view'],          'tenant'),
  ('team_member', 'quotes',       ARRAY['view'],          'tenant'),
  ('team_member', 'recipes',      ARRAY['view'],          'tenant'),
  ('team_member', 'inventory',    ARRAY['view'],          'tenant'),
  ('team_member', 'staff',        ARRAY['view'],          'self'),
  ('team_member', 'documents',    ARRAY['view'],          'tenant'),
  ('team_member', 'calendar',     ARRAY['view'],          'tenant'),
  ('team_member', 'comms',        ARRAY['view'],          'assigned'),
  ('team_member', 'ai',           ARRAY['view'],          'tenant')
ON CONFLICT (role, domain) DO NOTHING;

-- Seed client (own data only)
INSERT INTO role_permissions (role, domain, actions, scope) VALUES
  ('client', 'events',    ARRAY['view'],          'own'),
  ('client', 'quotes',    ARRAY['view'],          'own'),
  ('client', 'documents', ARRAY['view'],          'own'),
  ('client', 'comms',     ARRAY['view','create'], 'own'),
  ('client', 'ai',        ARRAY['view'],          'own')
ON CONFLICT (role, domain) DO NOTHING;

-- Seed partner (referral data only)
INSERT INTO role_permissions (role, domain, actions, scope) VALUES
  ('partner', 'analytics', ARRAY['view'], 'own')
ON CONFLICT (role, domain) DO NOTHING;

-- ─── 3. Per-user permission overrides ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  actions TEXT[] NOT NULL DEFAULT '{}',
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, auth_user_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_lookup
  ON user_permission_overrides (tenant_id, auth_user_id);

-- ─── 4. Permission audit log ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES chefs(id) ON DELETE SET NULL,
  actor_auth_user_id UUID NOT NULL,
  target_auth_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  domain TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_log_tenant
  ON permission_audit_log (tenant_id, created_at DESC);

-- ─── 5. Owner protection trigger on platform_admins ─────────────────────────────

CREATE OR REPLACE FUNCTION prevent_last_owner_removal() RETURNS TRIGGER AS $$
BEGIN
  -- Only protect if we are removing or deactivating an owner
  IF OLD.access_level = 'owner' THEN
    -- Check if this is a delete, deactivation, or downgrade
    IF TG_OP = 'DELETE'
       OR (TG_OP = 'UPDATE' AND (NEW.is_active = false OR NEW.access_level != 'owner'))
    THEN
      -- Count remaining active owners excluding this row
      IF (SELECT COUNT(*) FROM platform_admins
          WHERE access_level = 'owner' AND is_active = true AND id != OLD.id) = 0
      THEN
        RAISE EXCEPTION 'Cannot remove or deactivate the last platform owner';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_last_owner ON platform_admins;
CREATE TRIGGER protect_last_owner
  BEFORE UPDATE OR DELETE ON platform_admins
  FOR EACH ROW EXECUTE FUNCTION prevent_last_owner_removal();
