-- Historical scan coverage metrics and explicit Spam/Trash coverage.
-- Tracks how many message refs the scan has seen, persists Gmail's
-- resultSizeEstimate for progress UI, and makes Spam/Trash inclusion explicit.

ALTER TABLE google_connections
  ADD COLUMN IF NOT EXISTS historical_scan_total_seen INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS historical_scan_result_size_estimate INTEGER,
  ADD COLUMN IF NOT EXISTS historical_scan_include_spam_trash BOOLEAN NOT NULL DEFAULT true;

UPDATE google_connections
SET
  historical_scan_total_seen = GREATEST(historical_scan_total_seen, historical_scan_total_processed),
  historical_scan_include_spam_trash = true
WHERE historical_scan_total_seen < historical_scan_total_processed
   OR historical_scan_include_spam_trash IS DISTINCT FROM true;
