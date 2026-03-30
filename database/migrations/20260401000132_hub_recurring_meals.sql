-- Recurring meal patterns: "same breakfast every weekday" etc.
-- Chef sets a pattern, system auto-fills future weeks

CREATE TABLE hub_recurring_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  created_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),

  -- What to repeat
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  title TEXT NOT NULL,
  description TEXT,
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  allergen_flags TEXT[] NOT NULL DEFAULT '{}',
  head_count INTEGER,
  prep_notes TEXT,

  -- Pattern
  pattern TEXT NOT NULL CHECK (pattern IN ('daily', 'weekdays', 'weekends', 'weekly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Mon, 6=Sun (ISO). Required for 'weekly'

  -- Active window
  active_from DATE NOT NULL DEFAULT CURRENT_DATE,
  active_until DATE, -- NULL = indefinite
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_recurring_meals_group ON hub_recurring_meals(group_id, is_active);
