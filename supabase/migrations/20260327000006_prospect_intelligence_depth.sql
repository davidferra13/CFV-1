-- ================================================================
-- Prospect Intelligence Depth (Wave 2)
-- Deep crawl results, news intelligence, draft outreach emails,
-- staleness tracking, enrichment timestamps.
-- ================================================================

-- AI-drafted cold outreach email (chef reviews before sending)
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS draft_email TEXT;

-- Recent news/press about the prospect
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS news_intel TEXT;

-- When this prospect was last enriched (for staleness detection)
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;

-- Deep crawl: pages scraped during enrichment (URLs + summary)
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS enrichment_sources TEXT[];

COMMENT ON COLUMN prospects.draft_email IS 'AI-drafted personalized cold outreach email. Chef reviews and edits before sending.';
COMMENT ON COLUMN prospects.news_intel IS 'Recent news, press, or public events about this prospect gathered during enrichment.';
COMMENT ON COLUMN prospects.last_enriched_at IS 'Timestamp of last web enrichment. NULL = never enriched. Used for staleness detection.';
COMMENT ON COLUMN prospects.enrichment_sources IS 'URLs of pages scraped during enrichment for audit trail.';
