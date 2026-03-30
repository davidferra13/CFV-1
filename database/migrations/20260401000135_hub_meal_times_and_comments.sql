-- Meal serving times and per-meal comments

-- Add serving_time to individual meals (overrides group default)
ALTER TABLE hub_meal_board ADD COLUMN IF NOT EXISTS serving_time TIME DEFAULT NULL;

-- Add default serving times to groups (set once, apply to all meals)
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS default_meal_times JSONB DEFAULT NULL;
-- Expected format: {"breakfast": "08:00", "lunch": "12:30", "dinner": "19:00", "snack": null}

-- Per-meal comment thread (lightweight, not full chat)
CREATE TABLE IF NOT EXISTS hub_meal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_entry_id UUID NOT NULL REFERENCES hub_meal_board(id) ON DELETE CASCADE,
  author_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_meal_comments_entry
  ON hub_meal_comments(meal_entry_id, created_at);

-- Meal requests from family members
CREATE TABLE IF NOT EXISTS hub_meal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  requested_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'planned', 'declined')),
  resolved_meal_id UUID REFERENCES hub_meal_board(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hub_meal_requests_group
  ON hub_meal_requests(group_id, status);
