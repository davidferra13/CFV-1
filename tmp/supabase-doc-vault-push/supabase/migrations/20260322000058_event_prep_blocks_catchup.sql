-- ============================================
-- Catch-up: event_prep_blocks for drifted beta databases
-- ============================================
-- Some environments missed 20260304000001_event_prep_blocks.sql and later
-- runtime code now assumes event_prep_blocks exists. This migration is
-- intentionally idempotent so it can repair drifted databases without
-- affecting fresh installs where the original migration already ran.
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'prep_block_type'
  ) THEN
    CREATE TYPE prep_block_type AS ENUM (
      'grocery_run',
      'specialty_sourcing',
      'prep_session',
      'packing',
      'travel_to_event',
      'mental_prep',
      'equipment_prep',
      'admin',
      'cleanup',
      'custom'
    );
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS event_prep_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  block_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  block_type prep_block_type NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  store_name TEXT,
  store_address TEXT,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  is_system_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE event_prep_blocks
  ADD COLUMN IF NOT EXISTS chef_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS block_date DATE,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS block_type prep_block_type,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS store_name TEXT,
  ADD COLUMN IF NOT EXISTS store_address TEXT,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'event_prep_blocks'
      AND column_name = 'block_type'
      AND udt_name <> 'prep_block_type'
  ) THEN
    ALTER TABLE public.event_prep_blocks
      ALTER COLUMN block_type TYPE prep_block_type
      USING block_type::prep_block_type;
  END IF;
END $$;
ALTER TABLE event_prep_blocks
  ALTER COLUMN is_completed SET DEFAULT false,
  ALTER COLUMN is_system_generated SET DEFAULT false,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_prep_blocks_chef_date
  ON event_prep_blocks(chef_id, block_date);
CREATE INDEX IF NOT EXISTS idx_prep_blocks_event
  ON event_prep_blocks(event_id)
  WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prep_blocks_incomplete
  ON event_prep_blocks(chef_id, block_date)
  WHERE is_completed = false;
DROP TRIGGER IF EXISTS trg_prep_blocks_updated_at ON event_prep_blocks;
CREATE TRIGGER trg_prep_blocks_updated_at
  BEFORE UPDATE ON event_prep_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE event_prep_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS epb_chef_select ON event_prep_blocks;
CREATE POLICY epb_chef_select ON event_prep_blocks
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
DROP POLICY IF EXISTS epb_chef_insert ON event_prep_blocks;
CREATE POLICY epb_chef_insert ON event_prep_blocks
  FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
DROP POLICY IF EXISTS epb_chef_update ON event_prep_blocks;
CREATE POLICY epb_chef_update ON event_prep_blocks
  FOR UPDATE TO authenticated
  USING (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
DROP POLICY IF EXISTS epb_chef_delete ON event_prep_blocks;
CREATE POLICY epb_chef_delete ON event_prep_blocks
  FOR DELETE TO authenticated
  USING (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON event_prep_blocks TO authenticated;
