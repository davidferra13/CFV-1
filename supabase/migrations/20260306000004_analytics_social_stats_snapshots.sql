-- Analytics: Social Stats Snapshots
-- Stores periodic snapshots of Instagram (and future platform) metrics.
-- One row per (chef, platform, snapshot_date). Upserted by the sync job.
-- No existing tables or data are modified.

CREATE TABLE IF NOT EXISTS social_stats_snapshots (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                 UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  platform                TEXT        NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'linkedin', 'x', 'pinterest', 'youtube_shorts')),
  snapshot_date           DATE        NOT NULL,

  -- Core reach metrics
  followers               INTEGER,
  following               INTEGER,
  posts_count             INTEGER,

  -- Engagement (7-day rolling window pulled from the API)
  reach_7d                INTEGER,
  impressions_7d          INTEGER,
  profile_views_7d        INTEGER,

  -- Computed engagement rate: (likes + comments) / followers
  avg_engagement_rate     NUMERIC(6, 4),

  -- Top post in the snapshot window
  top_post_url            TEXT,
  top_post_likes          INTEGER,
  top_post_comments       INTEGER,

  -- Raw API response for re-processing
  raw_payload             JSONB        NOT NULL DEFAULT '{}'::jsonb,

  synced_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT social_stats_snapshots_unique UNIQUE (chef_id, platform, snapshot_date)
);

CREATE INDEX IF NOT EXISTS sss_chef_platform_date_idx
  ON social_stats_snapshots (chef_id, platform, snapshot_date DESC);

ALTER TABLE social_stats_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_sss_select"
  ON social_stats_snapshots FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

COMMENT ON TABLE social_stats_snapshots IS
  'Periodic snapshots of social media metrics (followers, engagement, reach) pulled via platform APIs. One row per chef/platform/date.';
