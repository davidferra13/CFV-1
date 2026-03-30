-- Hub Meal Attendance: track which household members are eating each meal
-- NOTE: hub_household_members table already exists (created by circle-first-communication migration)
-- with profile_id, display_name, relationship, age_group, dietary fields, etc.

-- Per-meal attendance (which household members are eating)
CREATE TABLE IF NOT EXISTS hub_meal_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_entry_id UUID NOT NULL REFERENCES hub_meal_board(id) ON DELETE CASCADE,
  household_member_id UUID NOT NULL REFERENCES hub_household_members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in' CHECK (status IN ('in', 'out', 'maybe')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(meal_entry_id, household_member_id)
);

CREATE INDEX IF NOT EXISTS idx_hub_meal_attendance_entry
  ON hub_meal_attendance(meal_entry_id);
