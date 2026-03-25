-- New: Allow staff members to have their own login (auth account).
-- Currently staff_members exists but has no auth_user_id column.
-- Staff can't log in, can't see their own assignments, can't clock in/out.
-- This adds the optional auth link (nullable because not all staff need accounts).

ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
-- Index for auth lookup
CREATE INDEX IF NOT EXISTS idx_staff_members_auth_user ON staff_members(auth_user_id)
  WHERE auth_user_id IS NOT NULL;
-- Add 'staff' to user_role enum if not already present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'staff' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'staff';
  END IF;
END $$;
-- RLS: Allow staff to see their own record
DROP POLICY IF EXISTS sm_staff_select_own ON staff_members;
CREATE POLICY sm_staff_select_own ON staff_members
  FOR SELECT USING (
    auth_user_id = auth.uid()
  );
-- RLS: Allow staff to see their own event assignments
DROP POLICY IF EXISTS esa_staff_select_own ON event_staff_assignments;
CREATE POLICY esa_staff_select_own ON event_staff_assignments
  FOR SELECT USING (
    staff_member_id IN (
      SELECT id FROM staff_members WHERE auth_user_id = auth.uid()
    )
  );
