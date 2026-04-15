-- ai_calls: add result column
-- Captures the outcome of vendor availability calls so the ingredient
-- resolution engine (queryAiCallFeedback) can use recent call outcomes
-- as Tier 2 signals without requiring a repeat call within 14 days.
--
-- 'yes' = vendor confirmed ingredient is in stock
-- 'no'  = vendor confirmed ingredient is not available
-- null  = call ended without a clear yes/no (timeout, hang-up, voicemail)

ALTER TABLE ai_calls
  ADD COLUMN IF NOT EXISTS result TEXT
  CHECK (result IN ('yes', 'no') OR result IS NULL);

-- Index for the Tier 2 feedback query:
--   SELECT ... FROM ai_calls WHERE chef_id = ? AND direction = 'outbound'
--   AND result = 'yes' AND subject ILIKE ? AND created_at >= ?
CREATE INDEX IF NOT EXISTS ai_calls_result_feedback_idx
  ON ai_calls(chef_id, direction, result, created_at DESC)
  WHERE result IS NOT NULL;
