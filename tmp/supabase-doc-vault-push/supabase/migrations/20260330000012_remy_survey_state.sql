-- Add survey_state JSONB column to ai_preferences for Remy conversational survey
-- Tracks survey progress: intro completion, current question, answered/skipped questions
-- NULL = survey never started

ALTER TABLE ai_preferences
ADD COLUMN IF NOT EXISTS survey_state JSONB DEFAULT NULL;
COMMENT ON COLUMN ai_preferences.survey_state IS 'Remy conversational survey progress — JSON with status, currentGroup, currentQuestion, answered[], skipped[]';
