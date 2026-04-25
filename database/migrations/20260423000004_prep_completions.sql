-- Prep completion tracking: server-side persistence for prep checklist items.
-- Enables cross-device sync (check on phone, see on desktop).

CREATE TABLE IF NOT EXISTS prep_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, item_key)
);

CREATE INDEX idx_prep_completions_event ON prep_completions(event_id);
