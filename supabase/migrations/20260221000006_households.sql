-- ============================================================
-- Layer: Household Linking
-- Purpose: Group clients into households (couples, families, groups)
--          with individual profiles and relationship types
-- ============================================================

-- Relationship enum
DO $$ BEGIN
  CREATE TYPE household_relationship AS ENUM (
    'partner',
    'child',
    'family_member',
    'regular_guest'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- ── Households table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS households (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  primary_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_households_tenant
  ON households(tenant_id);
-- RLS
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
CREATE POLICY households_chef_select ON households
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY households_chef_insert ON households
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY households_chef_update ON households
  FOR UPDATE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY households_chef_delete ON households
  FOR DELETE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- Updated_at trigger
CREATE TRIGGER set_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- ── Household Members table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS household_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  relationship   household_relationship NOT NULL,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_household_client UNIQUE(household_id, client_id)
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_household_members_household
  ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_client
  ON household_members(client_id);
-- RLS (via household tenant)
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY household_members_chef_select ON household_members
  FOR SELECT USING (
    household_id IN (
      SELECT h.id FROM households h
      WHERE h.tenant_id IN (
        SELECT entity_id FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    )
  );
CREATE POLICY household_members_chef_insert ON household_members
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT h.id FROM households h
      WHERE h.tenant_id IN (
        SELECT entity_id FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    )
  );
CREATE POLICY household_members_chef_update ON household_members
  FOR UPDATE USING (
    household_id IN (
      SELECT h.id FROM households h
      WHERE h.tenant_id IN (
        SELECT entity_id FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    )
  );
CREATE POLICY household_members_chef_delete ON household_members
  FOR DELETE USING (
    household_id IN (
      SELECT h.id FROM households h
      WHERE h.tenant_id IN (
        SELECT entity_id FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    )
  );
-- ── Add household_id to events (additive, nullable) ──────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_events_household
  ON events(household_id) WHERE household_id IS NOT NULL;
