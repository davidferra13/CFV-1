-- Add override_category column to event_readiness_gates
-- Stores the structured classification of override reasons for analytics and audit

ALTER TABLE event_readiness_gates
  ADD COLUMN IF NOT EXISTS override_category TEXT;

-- Index for filtering/grouping by category
CREATE INDEX IF NOT EXISTS idx_event_readiness_gates_override_category
  ON event_readiness_gates (override_category)
  WHERE override_category IS NOT NULL;

COMMENT ON COLUMN event_readiness_gates.override_category IS 'Structured category: time_constraint, client_request, ingredient_substitution, venue_change, simplified_service, chef_judgment, other';
