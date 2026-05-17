-- Security: Add tenant_id to guest_event_profile for cross-tenant isolation
-- Previously relied on token-only security with anon-permissive RLS policies.
-- This migration adds tenant_id, backfills from events, and tightens RLS.

-- Step 1: Add nullable tenant_id column
ALTER TABLE guest_event_profile
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Step 2: Backfill tenant_id from events table
-- Uses LEFT JOIN to handle orphaned rows (event deleted but cascade missed)
UPDATE guest_event_profile gep
SET tenant_id = e.tenant_id
FROM events e
WHERE e.id = gep.event_id
  AND gep.tenant_id IS NULL;

-- Step 3: Delete orphaned rows where no matching event exists
-- (These are broken data with no tenant ownership; cannot be scoped)
DELETE FROM guest_event_profile
WHERE tenant_id IS NULL
  AND event_id NOT IN (SELECT id FROM events);

-- Step 4: For any remaining nulls (should not exist), set NOT NULL will catch them
-- Make column NOT NULL after backfill
ALTER TABLE guest_event_profile
  ALTER COLUMN tenant_id SET NOT NULL;

-- Step 5: Add foreign key to chefs (tenant = chef)
ALTER TABLE guest_event_profile
  ADD CONSTRAINT guest_event_profile_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES chefs(id) ON DELETE CASCADE;

-- Step 6: Add index for tenant_id scoped queries
CREATE INDEX IF NOT EXISTS idx_guest_event_profile_tenant_id
  ON guest_event_profile(tenant_id);

-- Step 7: Composite index for common query pattern (tenant + event)
CREATE INDEX IF NOT EXISTS idx_guest_event_profile_tenant_event
  ON guest_event_profile(tenant_id, event_id);

-- Step 8: Update RLS policies to include tenant_id scoping

-- Chef policy: scope to tenant_id directly (no subquery needed now)
DROP POLICY IF EXISTS guest_event_profile_chef_all ON guest_event_profile;
CREATE POLICY guest_event_profile_chef_all ON guest_event_profile
  FOR ALL
  USING (
    tenant_id = (
      SELECT ur.entity_id
      FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid()
        AND ur.role = 'chef'
      LIMIT 1
    )
  );

-- Anon insert: must match an event's tenant_id
DROP POLICY IF EXISTS guest_event_profile_public_insert ON guest_event_profile;
DROP POLICY IF EXISTS guest_event_profile_anon_insert ON guest_event_profile;
CREATE POLICY guest_event_profile_anon_insert ON guest_event_profile
  FOR INSERT
  TO anon
  WITH CHECK (
    event_id IN (SELECT e.id FROM events e WHERE e.tenant_id = guest_event_profile.tenant_id)
  );

-- Anon select: must have matching event_id + tenant_id (app layer still filters by token)
DROP POLICY IF EXISTS guest_event_profile_public_select ON guest_event_profile;
DROP POLICY IF EXISTS guest_event_profile_anon_select ON guest_event_profile;
CREATE POLICY guest_event_profile_anon_select ON guest_event_profile
  FOR SELECT
  TO anon
  USING (
    event_id IN (SELECT e.id FROM events e WHERE e.tenant_id = guest_event_profile.tenant_id)
  );

-- Anon update: must match event + tenant
DROP POLICY IF EXISTS guest_event_profile_public_update ON guest_event_profile;
DROP POLICY IF EXISTS guest_event_profile_anon_update ON guest_event_profile;
CREATE POLICY guest_event_profile_anon_update ON guest_event_profile
  FOR UPDATE
  TO anon
  USING (
    event_id IN (SELECT e.id FROM events e WHERE e.tenant_id = guest_event_profile.tenant_id)
  );
