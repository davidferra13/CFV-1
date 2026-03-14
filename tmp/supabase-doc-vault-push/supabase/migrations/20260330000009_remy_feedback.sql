-- Remy Feedback — Thumbs up/down quality signals on Remy responses
-- Used to measure response quality over time, identify systematically bad
-- responses, and eventually as training signal for fine-tuning.

CREATE TABLE IF NOT EXISTS remy_feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  chef_id         uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  -- The user's query that triggered this response
  user_message    text NOT NULL,
  -- Remy's response content (truncated to 2000 chars)
  remy_response   text NOT NULL,
  -- Core feedback signal
  rating          text NOT NULL CHECK (rating IN ('up', 'down')),
  -- Optional category for thumbs-down (what was wrong?)
  feedback_type   text CHECK (feedback_type IN (
    'wrong_data',     -- cited incorrect information
    'unhelpful',      -- didn't answer the question
    'wrong_tone',     -- voice/personality was off
    'too_slow',       -- response took too long
    'wrong_action',   -- routed to wrong command
    'other'           -- free-text in notes
  )),
  -- Free-text notes (optional)
  notes           text,
  -- Context for analysis
  archetype_id    text,           -- which personality was active
  response_time_ms integer,       -- how long the response took
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- Index for querying feedback by tenant and time
CREATE INDEX idx_remy_feedback_tenant_created
  ON remy_feedback (tenant_id, created_at DESC);
-- Index for aggregating ratings
CREATE INDEX idx_remy_feedback_rating
  ON remy_feedback (rating, created_at DESC);
-- RLS: chefs can only see/create their own feedback
ALTER TABLE remy_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefs can insert their own feedback"
  ON remy_feedback FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "Chefs can view their own feedback"
  ON remy_feedback FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
