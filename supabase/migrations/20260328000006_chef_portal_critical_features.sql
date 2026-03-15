-- ChefFlow V1 critical feature schema updates
-- Additive only. No destructive changes.

-- ============================================================
-- 1) Notification preferences on chef_profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL UNIQUE REFERENCES chefs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_email_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_sms_enabled BOOLEAN NOT NULL DEFAULT false,
  notification_push_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chef_profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_email_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_sms_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_push_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_chef_profiles_tenant_id ON chef_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_profiles_chef_id ON chef_profiles(chef_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_chef_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trg_chef_profiles_updated_at
      BEFORE UPDATE ON chef_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE chef_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chef_profiles'
      AND policyname = 'chef_profiles_chef_select'
  ) THEN
    DROP POLICY IF EXISTS chef_profiles_chef_select ON chef_profiles;
    CREATE POLICY chef_profiles_chef_select
      ON chef_profiles
      FOR SELECT
      USING (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chef_profiles'
      AND policyname = 'chef_profiles_chef_insert'
  ) THEN
    DROP POLICY IF EXISTS chef_profiles_chef_insert ON chef_profiles;
    CREATE POLICY chef_profiles_chef_insert
      ON chef_profiles
      FOR INSERT
      WITH CHECK (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chef_profiles'
      AND policyname = 'chef_profiles_chef_update'
  ) THEN
    DROP POLICY IF EXISTS chef_profiles_chef_update ON chef_profiles;
    CREATE POLICY chef_profiles_chef_update
      ON chef_profiles
      FOR UPDATE
      USING (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      )
      WITH CHECK (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      );
  END IF;
END $$;

-- ============================================================
-- 2) Integration connection settings on tenant_settings
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES chefs(id) ON DELETE CASCADE,
  integration_connection_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  integration_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS integration_connection_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS integration_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tenant_settings_updated_at'
  ) THEN
    CREATE TRIGGER trg_tenant_settings_updated_at
      BEFORE UPDATE ON tenant_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_settings'
      AND policyname = 'tenant_settings_chef_select'
  ) THEN
    DROP POLICY IF EXISTS tenant_settings_chef_select ON tenant_settings;
    CREATE POLICY tenant_settings_chef_select
      ON tenant_settings
      FOR SELECT
      USING (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_settings'
      AND policyname = 'tenant_settings_chef_insert'
  ) THEN
    DROP POLICY IF EXISTS tenant_settings_chef_insert ON tenant_settings;
    CREATE POLICY tenant_settings_chef_insert
      ON tenant_settings
      FOR INSERT
      WITH CHECK (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_settings'
      AND policyname = 'tenant_settings_chef_update'
  ) THEN
    DROP POLICY IF EXISTS tenant_settings_chef_update ON tenant_settings;
    CREATE POLICY tenant_settings_chef_update
      ON tenant_settings
      FOR UPDATE
      USING (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      )
      WITH CHECK (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      );
  END IF;
END $$;

-- ============================================================
-- 3) Client preference fields on clients
-- ============================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS preferred_event_days TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_service_style TEXT,
  ADD COLUMN IF NOT EXISTS budget_range_min_cents INTEGER,
  ADD COLUMN IF NOT EXISTS budget_range_max_cents INTEGER,
  ADD COLUMN IF NOT EXISTS cleanup_expectations TEXT,
  ADD COLUMN IF NOT EXISTS leftovers_preference TEXT;

-- ============================================================
-- 4) Team member relationships on chef_team_members
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  member_chef_id UUID REFERENCES chefs(id) ON DELETE SET NULL,
  member_email TEXT NOT NULL,
  member_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sous_chef',
  status TEXT NOT NULL DEFAULT 'invited',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chef_team_members_status_check
    CHECK (status IN ('invited', 'active', 'inactive', 'removed'))
);

ALTER TABLE chef_team_members
  ADD COLUMN IF NOT EXISTS member_chef_id UUID REFERENCES chefs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS member_email TEXT,
  ADD COLUMN IF NOT EXISTS member_name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_chef_team_members_tenant ON chef_team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_team_members_member ON chef_team_members(member_chef_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_chef_team_members_tenant_email
  ON chef_team_members(tenant_id, lower(member_email));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_chef_team_members_updated_at'
  ) THEN
    CREATE TRIGGER trg_chef_team_members_updated_at
      BEFORE UPDATE ON chef_team_members
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE chef_team_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chef_team_members'
      AND policyname = 'chef_team_members_chef_all'
  ) THEN
    DROP POLICY IF EXISTS chef_team_members_chef_all ON chef_team_members;
    CREATE POLICY chef_team_members_chef_all
      ON chef_team_members
      FOR ALL
      USING (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      )
      WITH CHECK (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      );
  END IF;
END $$;

-- ============================================================
-- 5) Time block management table for advanced scheduling
-- ============================================================

CREATE TABLE IF NOT EXISTS time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'personal',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT time_blocks_type_check
    CHECK (block_type IN ('prep', 'travel', 'personal', 'admin', 'hold')),
  CONSTRAINT time_blocks_range_check
    CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_time_blocks_tenant_start ON time_blocks(tenant_id, start_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_time_blocks_updated_at'
  ) THEN
    CREATE TRIGGER trg_time_blocks_updated_at
      BEFORE UPDATE ON time_blocks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'time_blocks'
      AND policyname = 'time_blocks_chef_all'
  ) THEN
    DROP POLICY IF EXISTS time_blocks_chef_all ON time_blocks;
    CREATE POLICY time_blocks_chef_all
      ON time_blocks
      FOR ALL
      USING (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      )
      WITH CHECK (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      );
  END IF;
END $$;

-- ============================================================
-- 6) Contract version history and multi-party signers
-- ============================================================

CREATE TABLE IF NOT EXISTS event_contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES event_contracts(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  body_snapshot TEXT NOT NULL,
  change_note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_event_contract_versions_contract
  ON event_contract_versions(contract_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_event_contract_versions_tenant
  ON event_contract_versions(tenant_id);

CREATE TABLE IF NOT EXISTS event_contract_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES event_contracts(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
  signer_role TEXT NOT NULL DEFAULT 'client',
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  signing_order INTEGER NOT NULL DEFAULT 1,
  signed_at TIMESTAMPTZ,
  signature_data_url TEXT,
  signer_ip_address TEXT,
  signer_user_agent TEXT,
  signed_by_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_contract_signers_role_check
    CHECK (signer_role IN ('client', 'chef', 'witness', 'co_host')),
  CONSTRAINT event_contract_signers_order_check
    CHECK (signing_order >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_contract_signers_contract_email
  ON event_contract_signers(contract_id, lower(signer_email));
CREATE INDEX IF NOT EXISTS idx_event_contract_signers_contract_order
  ON event_contract_signers(contract_id, signing_order);
CREATE INDEX IF NOT EXISTS idx_event_contract_signers_tenant
  ON event_contract_signers(tenant_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_event_contract_signers_updated_at'
  ) THEN
    CREATE TRIGGER trg_event_contract_signers_updated_at
      BEFORE UPDATE ON event_contract_signers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Backfill tenant_id from parent contract when missing.
UPDATE event_contract_versions v
SET tenant_id = c.chef_id
FROM event_contracts c
WHERE v.contract_id = c.id
  AND v.tenant_id IS NULL;

UPDATE event_contract_signers s
SET tenant_id = c.chef_id
FROM event_contracts c
WHERE s.contract_id = c.id
  AND s.tenant_id IS NULL;

ALTER TABLE event_contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_contract_signers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_contract_versions'
      AND policyname = 'event_contract_versions_chef_all'
  ) THEN
    DROP POLICY IF EXISTS event_contract_versions_chef_all ON event_contract_versions;
    CREATE POLICY event_contract_versions_chef_all
      ON event_contract_versions
      FOR ALL
      USING (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      )
      WITH CHECK (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_contract_versions'
      AND policyname = 'event_contract_versions_client_select'
  ) THEN
    DROP POLICY IF EXISTS event_contract_versions_client_select ON event_contract_versions;
    CREATE POLICY event_contract_versions_client_select
      ON event_contract_versions
      FOR SELECT
      USING (
        get_current_user_role() = 'client' AND
        EXISTS (
          SELECT 1
          FROM event_contracts c
          WHERE c.id = event_contract_versions.contract_id
            AND c.client_id = get_current_client_id()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_contract_signers'
      AND policyname = 'event_contract_signers_chef_all'
  ) THEN
    DROP POLICY IF EXISTS event_contract_signers_chef_all ON event_contract_signers;
    CREATE POLICY event_contract_signers_chef_all
      ON event_contract_signers
      FOR ALL
      USING (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      )
      WITH CHECK (
        get_current_user_role() = 'chef' AND
        tenant_id = get_current_tenant_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_contract_signers'
      AND policyname = 'event_contract_signers_client_select'
  ) THEN
    DROP POLICY IF EXISTS event_contract_signers_client_select ON event_contract_signers;
    CREATE POLICY event_contract_signers_client_select
      ON event_contract_signers
      FOR SELECT
      USING (
        get_current_user_role() = 'client' AND
        EXISTS (
          SELECT 1
          FROM event_contracts c
          WHERE c.id = event_contract_signers.contract_id
            AND c.client_id = get_current_client_id()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_contract_signers'
      AND policyname = 'event_contract_signers_client_update'
  ) THEN
    DROP POLICY IF EXISTS event_contract_signers_client_update ON event_contract_signers;
    CREATE POLICY event_contract_signers_client_update
      ON event_contract_signers
      FOR UPDATE
      USING (
        get_current_user_role() = 'client' AND
        signed_at IS NULL AND
        EXISTS (
          SELECT 1
          FROM event_contracts c
          WHERE c.id = event_contract_signers.contract_id
            AND c.client_id = get_current_client_id()
        )
      )
      WITH CHECK (
        get_current_user_role() = 'client' AND
        EXISTS (
          SELECT 1
          FROM event_contracts c
          WHERE c.id = event_contract_signers.contract_id
            AND c.client_id = get_current_client_id()
        )
      );
  END IF;
END $$;

