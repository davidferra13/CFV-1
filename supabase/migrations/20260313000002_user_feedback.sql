-- Migration: user_feedback
-- Purpose: Allow any app user (chef, client, or anonymous) to submit
--          feedback to the developer. Feedback is stored here and surfaced
--          to admins at /admin/feedback.
-- Additive only — no existing tables modified.

CREATE TABLE user_feedback (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  anonymous    BOOLEAN     NOT NULL DEFAULT false,
  -- null when anonymous=true OR submitted while not logged in
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role    TEXT,       -- 'chef' | 'client' | null
  sentiment    TEXT        NOT NULL
                CHECK (sentiment IN ('love', 'frustrated', 'suggestion', 'bug', 'other')),
  message      TEXT        NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  page_context TEXT,       -- URL path captured at submission time
  metadata     JSONB       NOT NULL DEFAULT '{}'
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Only the service role (admin client) can read feedback
DROP POLICY IF EXISTS "service_role_read_feedback" ON user_feedback;
CREATE POLICY "service_role_read_feedback"
  ON user_feedback FOR SELECT
  USING (auth.role() = 'service_role');

-- Anyone — authenticated or not — can insert via the server action
DROP POLICY IF EXISTS "anyone_insert_feedback" ON user_feedback;
CREATE POLICY "anyone_insert_feedback"
  ON user_feedback FOR INSERT
  WITH CHECK (true);

-- Index for admin queries (most recent first)
CREATE INDEX idx_user_feedback_created_at ON user_feedback (created_at DESC);
CREATE INDEX idx_user_feedback_sentiment   ON user_feedback (sentiment);
