-- ================================================================
-- Prospect Intelligence Wave 3
-- Event signals, competitor source tracking.
-- ================================================================

-- Upcoming events detected from the prospect's public calendar/events page
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS event_signals TEXT;
-- Track what kind of scrub generated this prospect
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS scrub_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (scrub_type IN ('standard', 'competitor', 'lookalike'));
-- The prospect this was modeled after (for lookalike scrubs)
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS lookalike_source_id UUID REFERENCES prospects(id) ON DELETE SET NULL;
COMMENT ON COLUMN prospects.event_signals IS 'Upcoming events detected from the prospect website calendar/events page. Used for outreach timing.';
COMMENT ON COLUMN prospects.scrub_type IS 'How this prospect was generated: standard AI scrub, competitor intelligence, or lookalike expansion.';
COMMENT ON COLUMN prospects.lookalike_source_id IS 'For lookalike scrubs, the prospect this one was modeled after.';
