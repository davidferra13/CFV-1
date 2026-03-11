-- Post-Event Debrief Fields
-- Adds three nullable columns to the events table to support the post-dinner
-- debrief flow. The debrief is opt-in — nothing is mandatory.
--
-- debrief_completed_at: timestamp when chef clicked "Complete Debrief"
-- chef_outcome_notes:   free-text reflection (what stood out, remember next time)
-- chef_outcome_rating:  1–5 star rating of how the dinner went overall

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS debrief_completed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS chef_outcome_notes     TEXT,
  ADD COLUMN IF NOT EXISTS chef_outcome_rating    SMALLINT
    CONSTRAINT events_chef_outcome_rating_range
      CHECK (chef_outcome_rating IS NULL OR chef_outcome_rating BETWEEN 1 AND 5);
COMMENT ON COLUMN events.debrief_completed_at IS
  'Timestamp when the chef clicked "Complete Debrief". NULL means not yet completed.';
COMMENT ON COLUMN events.chef_outcome_notes IS
  'Free-text chef reflection: what stood out, what to remember next time.';
COMMENT ON COLUMN events.chef_outcome_rating IS
  '1–5 star rating of how the dinner went overall. Set by chef during debrief.';
