-- Client Passport: persists communication preferences and autonomy settings per client
CREATE TABLE IF NOT EXISTS client_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  communication_mode TEXT NOT NULL DEFAULT 'direct'
    CHECK (communication_mode IN ('direct', 'delegate_only', 'delegate_preferred')),
  preferred_contact_method TEXT DEFAULT 'email'
    CHECK (preferred_contact_method IN ('email', 'sms', 'phone', 'circle')),
  chef_autonomy_level TEXT NOT NULL DEFAULT 'moderate'
    CHECK (chef_autonomy_level IN ('full', 'high', 'moderate', 'low')),
  auto_approve_under_cents INTEGER DEFAULT 0,
  max_interaction_rounds INTEGER DEFAULT NULL,
  standing_instructions TEXT DEFAULT NULL,
  default_guest_count INTEGER DEFAULT 2,
  budget_range_min_cents INTEGER DEFAULT NULL,
  budget_range_max_cents INTEGER DEFAULT NULL,
  service_style TEXT DEFAULT NULL
    CHECK (service_style IS NULL OR service_style IN (
      'formal_plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'no_preference'
    )),
  default_locations JSONB DEFAULT '[]'::jsonb,
  delegate_name TEXT DEFAULT NULL,
  delegate_email TEXT DEFAULT NULL,
  delegate_phone TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, client_id)
);

-- Upgrade the earlier profile-scoped passport shape if that migration exists in this database.
ALTER TABLE client_passports ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE client_passports ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE client_passports ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email';
ALTER TABLE client_passports ADD COLUMN IF NOT EXISTS delegate_name TEXT DEFAULT NULL;
ALTER TABLE client_passports ADD COLUMN IF NOT EXISTS delegate_email TEXT DEFAULT NULL;
ALTER TABLE client_passports ADD COLUMN IF NOT EXISTS delegate_phone TEXT DEFAULT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_passports'
      AND column_name = 'profile_id'
  ) THEN
    UPDATE client_passports cp
    SET
      client_id = COALESCE(cp.client_id, hgp.client_id),
      tenant_id = COALESCE(cp.tenant_id, c.tenant_id)
    FROM hub_guest_profiles hgp
    LEFT JOIN clients c ON c.id = hgp.client_id
    WHERE cp.profile_id = hgp.id;

    ALTER TABLE client_passports DROP CONSTRAINT IF EXISTS uq_client_passports_profile;
    DROP INDEX IF EXISTS idx_client_passports_profile;
    ALTER TABLE client_passports DROP COLUMN IF EXISTS profile_id;
  END IF;
END $$;

UPDATE client_passports cp
SET tenant_id = COALESCE(cp.tenant_id, c.tenant_id)
FROM clients c
WHERE cp.client_id = c.id
  AND cp.tenant_id IS NULL;

ALTER TABLE client_passports ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE client_passports ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE client_passports ALTER COLUMN communication_mode SET DEFAULT 'direct';
ALTER TABLE client_passports ALTER COLUMN communication_mode SET NOT NULL;
ALTER TABLE client_passports ALTER COLUMN preferred_contact_method SET DEFAULT 'email';
ALTER TABLE client_passports ALTER COLUMN chef_autonomy_level SET DEFAULT 'moderate';
ALTER TABLE client_passports ALTER COLUMN chef_autonomy_level SET NOT NULL;
ALTER TABLE client_passports ALTER COLUMN auto_approve_under_cents SET DEFAULT 0;
ALTER TABLE client_passports ALTER COLUMN max_interaction_rounds DROP DEFAULT;
ALTER TABLE client_passports ALTER COLUMN default_guest_count SET DEFAULT 2;
ALTER TABLE client_passports ALTER COLUMN default_locations SET DEFAULT '[]'::jsonb;

ALTER TABLE client_passports DROP CONSTRAINT IF EXISTS client_passports_communication_mode_check;
ALTER TABLE client_passports DROP CONSTRAINT IF EXISTS client_passports_preferred_contact_method_check;
ALTER TABLE client_passports DROP CONSTRAINT IF EXISTS client_passports_chef_autonomy_level_check;
ALTER TABLE client_passports DROP CONSTRAINT IF EXISTS client_passports_service_style_check;
ALTER TABLE client_passports ADD CONSTRAINT client_passports_communication_mode_check
  CHECK (communication_mode IN ('direct', 'delegate_only', 'delegate_preferred'));
ALTER TABLE client_passports ADD CONSTRAINT client_passports_preferred_contact_method_check
  CHECK (preferred_contact_method IN ('email', 'sms', 'phone', 'circle'));
ALTER TABLE client_passports ADD CONSTRAINT client_passports_chef_autonomy_level_check
  CHECK (chef_autonomy_level IN ('full', 'high', 'moderate', 'low'));
ALTER TABLE client_passports ADD CONSTRAINT client_passports_service_style_check
  CHECK (service_style IS NULL OR service_style IN (
    'formal_plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'no_preference'
  ));

ALTER TABLE client_passports DROP CONSTRAINT IF EXISTS client_passports_tenant_id_fkey;
ALTER TABLE client_passports DROP CONSTRAINT IF EXISTS client_passports_client_id_fkey;
ALTER TABLE client_passports DROP CONSTRAINT IF EXISTS client_passports_tenant_id_client_id_key;
ALTER TABLE client_passports ADD CONSTRAINT client_passports_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES chefs(id) ON DELETE CASCADE;
ALTER TABLE client_passports ADD CONSTRAINT client_passports_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE client_passports ADD CONSTRAINT client_passports_tenant_id_client_id_key
  UNIQUE(tenant_id, client_id);

CREATE INDEX IF NOT EXISTS idx_client_passports_tenant ON client_passports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_passports_client ON client_passports(client_id);

-- Add 'delegate' to hub_group_members role constraint
ALTER TABLE hub_group_members DROP CONSTRAINT IF EXISTS hub_group_members_role_check;
ALTER TABLE hub_group_members ADD CONSTRAINT hub_group_members_role_check
  CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'chef'::text, 'member'::text, 'viewer'::text, 'delegate'::text]));
