-- Prep assignments: chef assigns circle members to meal board entries
-- Enables learning mode where members see exactly what they need to do

ALTER TABLE hub_meal_board
  ADD COLUMN assigned_profile_id UUID REFERENCES hub_guest_profiles(id) ON DELETE SET NULL,
  ADD COLUMN assigned_display_name TEXT,
  ADD COLUMN assignment_notes TEXT;

CREATE INDEX idx_hub_meal_board_assigned
  ON hub_meal_board(assigned_profile_id)
  WHERE assigned_profile_id IS NOT NULL;

COMMENT ON COLUMN hub_meal_board.assigned_profile_id IS 'Circle member assigned to help with this meal';
COMMENT ON COLUMN hub_meal_board.assigned_display_name IS 'Denormalized display name of assignee (avoids join)';
COMMENT ON COLUMN hub_meal_board.assignment_notes IS 'Chef instructions for the assignee (step-by-step what to do)';
