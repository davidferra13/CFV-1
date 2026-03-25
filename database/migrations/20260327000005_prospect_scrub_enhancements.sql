-- ================================================================
-- Prospect Scrub Enhancements
-- Adds lead_score to prospects, progress_message to scrub sessions,
-- and verified flag for reality-checked prospects.
-- ================================================================

-- Lead score: deterministic 0-100 score computed from structured fields
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0
    CHECK (lead_score >= 0 AND lead_score <= 100);

-- Whether the prospect was verified to exist via web search
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

-- Progress message for live UI feedback during scrub
ALTER TABLE prospect_scrub_sessions
  ADD COLUMN IF NOT EXISTS progress_message TEXT;

-- Index for sorting by lead score
CREATE INDEX IF NOT EXISTS idx_prospects_chef_lead_score
  ON prospects(chef_id, lead_score DESC);

COMMENT ON COLUMN prospects.lead_score IS 'Deterministic 0-100 score computed from structured fields: budget, events, luxury indicators, contact info quality.';
COMMENT ON COLUMN prospects.verified IS 'Whether a web search confirmed this prospect actually exists.';
COMMENT ON COLUMN prospect_scrub_sessions.progress_message IS 'Live progress text for UI polling during scrub (e.g. "Enriching 3/5...").';
