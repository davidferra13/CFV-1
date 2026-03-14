-- Product Tour Progress
-- Tracks each user's progress through role-specific onboarding tours,
-- contextual tooltips, and feature discovery checklists.
--
-- Design decisions:
--   - One row per auth user (not per role, since user_roles is 1:1)
--   - completed_steps is a text[] array of step IDs (e.g., 'chef.welcome', 'chef.first_event')
--   - Step definitions live in code (lib/onboarding/tour-config.ts), not in the DB
--   - dismissed_at lets users hide the checklist permanently
--   - welcome_seen_at tracks if they've seen the role-specific welcome modal

CREATE TABLE IF NOT EXISTS product_tour_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('chef', 'client', 'staff')),

  -- Step completion tracking
  completed_steps TEXT[] NOT NULL DEFAULT '{}',

  -- UI state
  welcome_seen_at TIMESTAMPTZ,
  checklist_dismissed_at TIMESTAMPTZ,
  tour_dismissed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(auth_user_id)
);

COMMENT ON TABLE product_tour_progress IS
  'Tracks per-user progress through role-specific product tours and onboarding checklists.';
COMMENT ON COLUMN product_tour_progress.completed_steps IS
  'Array of step IDs the user has completed (e.g., chef.welcome, chef.first_event).';

-- RLS
ALTER TABLE product_tour_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY tour_progress_own ON product_tour_progress
  FOR ALL USING (auth_user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_tour_progress_user
  ON product_tour_progress(auth_user_id);

-- Grant service role full access (for server actions)
GRANT ALL ON product_tour_progress TO service_role;
