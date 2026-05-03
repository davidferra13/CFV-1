-- Add assignment support to prep timeline items
-- Allows tasks to be assigned to specific collaborators on co-hosted events.

ALTER TABLE event_prep_timeline
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES chefs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_name TEXT;

CREATE INDEX IF NOT EXISTS idx_event_prep_timeline_assigned ON event_prep_timeline(assigned_to)
  WHERE assigned_to IS NOT NULL;
