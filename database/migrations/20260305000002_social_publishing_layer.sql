-- Migration: Social Publishing Layer
-- Adds publishing tracking to social_posts, hashtag library, and OAuth state management
-- All changes are purely additive. No existing data is touched.
-- Part of the Social Media Marketing Agent redesign (Phase 1/2 foundation).

-- ============================================================
-- 1. Publishing tracking columns on social_posts
-- ============================================================
-- These columns allow the publishing cron to track attempts,
-- record per-platform errors, and store external post IDs.

ALTER TABLE social_posts
  ADD COLUMN IF NOT EXISTS publish_attempts SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_publish_error TEXT,
  ADD COLUMN IF NOT EXISTS publish_errors JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS published_external_ids JSONB NOT NULL DEFAULT '{}'::JSONB;

-- publish_errors maps platform → error string, e.g.
--   { "instagram": "rate limit exceeded", "tiktok": "auth token expired" }
-- published_external_ids maps platform → external post ID, e.g.
--   { "instagram": "IGMID_123456", "x": "tweet_789", "facebook": "fb_post_101" }

COMMENT ON COLUMN social_posts.publish_attempts IS 'Number of times the publishing cron has attempted to publish this post (across all platforms).';
COMMENT ON COLUMN social_posts.last_publish_at IS 'Timestamp of last successful publish to any platform.';
COMMENT ON COLUMN social_posts.last_publish_error IS 'Human-readable last error message, shown to chef in the post editor.';
COMMENT ON COLUMN social_posts.publish_errors IS 'Per-platform error messages from last publish attempt. Keys are SocialPlatform values.';
COMMENT ON COLUMN social_posts.published_external_ids IS 'Per-platform external post IDs after successful publish. Keys are SocialPlatform values.';

-- ============================================================
-- 2. Index for publishing cron query performance
-- ============================================================
-- The cron queries posts where status = queued and preflight is ready,
-- ordered by schedule_at. This partial index makes that instant.

CREATE INDEX IF NOT EXISTS social_posts_queued_schedule_idx
  ON social_posts (tenant_id, schedule_at ASC)
  WHERE status = 'queued' AND preflight_ready = true;

-- ============================================================
-- 3. Hashtag library table
-- ============================================================
-- Allows chefs to save named hashtag sets that can be inserted
-- into any post with a single click, eliminating repetitive typing.
-- Example: "Recipe Posts - Core" → ['#privatechef', '#foodie', '#dinnerparty', ...]

CREATE TABLE IF NOT EXISTS social_hashtag_sets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_by    UUID        NOT NULL,
  set_name      TEXT        NOT NULL,
  hashtags      TEXT[]      NOT NULL DEFAULT '{}',
  pillar        social_pillar,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_hashtag_sets_tenant_idx
  ON social_hashtag_sets (tenant_id, created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER social_hashtag_sets_updated_at
  BEFORE UPDATE ON social_hashtag_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE social_hashtag_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_hashtag_sets_select" ON social_hashtag_sets;
CREATE POLICY "chef_hashtag_sets_select"
  ON social_hashtag_sets FOR SELECT
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "chef_hashtag_sets_insert" ON social_hashtag_sets;
CREATE POLICY "chef_hashtag_sets_insert"
  ON social_hashtag_sets FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "chef_hashtag_sets_update" ON social_hashtag_sets;
CREATE POLICY "chef_hashtag_sets_update"
  ON social_hashtag_sets FOR UPDATE
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "chef_hashtag_sets_delete" ON social_hashtag_sets;
CREATE POLICY "chef_hashtag_sets_delete"
  ON social_hashtag_sets FOR DELETE
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

-- ============================================================
-- 4. OAuth state table (for Phase 2 platform connections)
-- ============================================================
-- Stores the state parameter used in OAuth flows to prevent CSRF.
-- Also stores the PKCE code_verifier for platforms that require it (e.g., X).
-- Rows expire after 10 minutes and are cleaned up by the cron.

CREATE TABLE IF NOT EXISTS social_oauth_states (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL,
  platform       TEXT        NOT NULL,
  state          TEXT        NOT NULL UNIQUE,
  code_verifier  TEXT,
  redirect_to    TEXT,
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '10 minutes',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_oauth_states_state_idx
  ON social_oauth_states (state);

CREATE INDEX IF NOT EXISTS social_oauth_states_expires_idx
  ON social_oauth_states (expires_at);
-- Note: partial index with WHERE expires_at < now() is not valid in PostgreSQL
-- because now() is VOLATILE. Full index on expires_at serves the cleanup cron equally well.

-- No RLS needed — this table is accessed only by server-side cron/API routes
-- using the service role key, never by client-side queries.

COMMENT ON TABLE social_oauth_states IS 'Temporary storage for OAuth PKCE state during social platform connection flows. Expires after 10 minutes.';
