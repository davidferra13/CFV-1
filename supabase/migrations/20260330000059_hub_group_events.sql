-- Multi-event circles: junction table linking hub groups to multiple events.
-- Supports dinner clubs, recurring circles, and multi-event planning groups.

CREATE TABLE IF NOT EXISTS hub_group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by_profile_id UUID REFERENCES hub_guest_profiles(id) ON DELETE SET NULL,
  UNIQUE(group_id, event_id)
);

CREATE INDEX idx_hub_group_events_group ON hub_group_events(group_id);
CREATE INDEX idx_hub_group_events_event ON hub_group_events(event_id);

-- Add group_type column to hub_groups for distinguishing single-event vs multi-event circles
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS group_type TEXT NOT NULL DEFAULT 'circle';
-- group_type values: 'circle' (default single event), 'dinner_club' (recurring), 'planning' (multi-event)

COMMENT ON TABLE hub_group_events IS 'Junction table linking hub groups to multiple events for dinner clubs and recurring circles.';

-- RLS: service role only (all hub queries go through admin client)
ALTER TABLE hub_group_events ENABLE ROW LEVEL SECURITY;
