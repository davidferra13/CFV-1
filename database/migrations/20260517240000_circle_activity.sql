-- Circle Activity Feed
-- Chronological feed per dinner circle / event.
-- Menu changes, guest responses, payments, sourcing updates, messages.

CREATE TABLE IF NOT EXISTS circle_activity (
  id            SERIAL PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  event_id      TEXT NOT NULL,
  circle_id     TEXT,
  actor_name    TEXT NOT NULL,
  actor_role    TEXT NOT NULL,
  action_verb   TEXT NOT NULL,
  object_type   TEXT NOT NULL,
  object_label  TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary feed query: all activity for an event, newest first
CREATE INDEX idx_circle_activity_feed
  ON circle_activity (tenant_id, event_id, created_at DESC);

-- RLS
ALTER TABLE circle_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS circle_activity_select ON circle_activity;
CREATE POLICY circle_activity_select ON circle_activity
  FOR SELECT USING (true);

DROP POLICY IF EXISTS circle_activity_insert ON circle_activity;
CREATE POLICY circle_activity_insert ON circle_activity
  FOR INSERT WITH CHECK (true);
