-- Persisted platform admin access.
-- Replaces env-driven ADMIN_EMAILS authorization with an audited table.

CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL CHECK (email = lower(email)),
  access_level TEXT NOT NULL DEFAULT 'admin' CHECK (access_level IN ('admin', 'owner')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by_auth_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_admins_email
  ON platform_admins (lower(email));

CREATE INDEX IF NOT EXISTS idx_platform_admins_active_auth_user
  ON platform_admins (auth_user_id, is_active);

COMMENT ON TABLE platform_admins IS
  'Persisted platform admin allowlist. Authorization must read from this table, not ADMIN_EMAILS.';

COMMENT ON COLUMN platform_admins.access_level IS
  'owner = founder/break-glass operator, admin = standard platform operator.';

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_admins_self_select ON platform_admins;
CREATE POLICY platform_admins_self_select
  ON platform_admins
  FOR SELECT
  USING (auth.uid() = auth_user_id AND is_active = TRUE);

DROP POLICY IF EXISTS platform_admins_service_role_all ON platform_admins;
CREATE POLICY platform_admins_service_role_all
  ON platform_admins
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

INSERT INTO platform_admins (auth_user_id, email, access_level, is_active, notes)
SELECT
  ur.auth_user_id,
  LOWER(c.email),
  'owner',
  TRUE,
  'Founder bootstrap access'
FROM chefs c
JOIN user_roles ur
  ON ur.entity_id = c.id
 AND ur.role = 'chef'
WHERE LOWER(c.email) = 'davidferra13@gmail.com'
ON CONFLICT (auth_user_id) DO UPDATE
SET
  email = EXCLUDED.email,
  access_level = 'owner',
  is_active = TRUE,
  updated_at = NOW();
