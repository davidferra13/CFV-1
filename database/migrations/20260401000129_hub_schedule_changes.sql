-- Hub Schedule Changes: quick flags from family members about day-level changes
-- "4 extra guests Friday", "We're out of town Monday", "Cancel dinner Thursday"

CREATE TABLE hub_schedule_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  posted_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),

  -- What's changing
  change_date DATE NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'extra_guests', 'fewer_guests', 'skip_day', 'skip_meal',
    'time_change', 'location_change', 'other'
  )),
  description TEXT NOT NULL,
  affected_meals TEXT[] DEFAULT '{}',

  -- Resolution
  acknowledged_by_profile_id UUID REFERENCES hub_guest_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_schedule_changes_group_date ON hub_schedule_changes(group_id, change_date);
