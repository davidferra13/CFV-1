-- Migration: 20260511000026_consumer_saved_chefs.sql
-- Purpose: Consumer-side saved chef bookmark.
--          Lets a consumer save/bookmark a chef from the public directory.
--          Used to prioritise saved chefs in the discovery scroll featured section.

CREATE TABLE IF NOT EXISTS consumer_saved_chefs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chef_id        UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_consumer_saved_chefs_user_chef UNIQUE (auth_user_id, chef_id)
);

COMMENT ON TABLE consumer_saved_chefs IS
  'Consumer-side saved chef bookmark. Each row represents a consumer bookmarking a chef '
  'from the public directory. Unique per (auth_user_id, chef_id). '
  'Saved chefs are prioritised in the discovery scroll featured section.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consumer_saved_chefs_user
  ON consumer_saved_chefs (auth_user_id);

CREATE INDEX IF NOT EXISTS idx_consumer_saved_chefs_chef
  ON consumer_saved_chefs (chef_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_consumer_saved_chefs_user_chef
  ON consumer_saved_chefs (auth_user_id, chef_id);

-- Row-Level Security
ALTER TABLE consumer_saved_chefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved chefs"
  ON consumer_saved_chefs
  FOR ALL
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Service role full access"
  ON consumer_saved_chefs
  FOR ALL
  USING (true);
