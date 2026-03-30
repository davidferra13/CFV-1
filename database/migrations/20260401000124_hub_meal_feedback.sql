-- Hub Meal Feedback: per-meal reactions from circle members
-- Enables thumbs up/down feedback on individual meals

CREATE TABLE hub_meal_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_entry_id UUID NOT NULL REFERENCES hub_meal_board(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),

  -- Core feedback
  reaction TEXT NOT NULL CHECK (reaction IN ('loved', 'liked', 'neutral', 'disliked')),
  note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One feedback per person per meal
  UNIQUE(meal_entry_id, profile_id)
);

CREATE INDEX idx_hub_meal_feedback_entry ON hub_meal_feedback(meal_entry_id);
CREATE INDEX idx_hub_meal_feedback_profile ON hub_meal_feedback(profile_id);
