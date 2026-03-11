-- ============================================
-- SOCIAL CONTENT VAULT + ROLLING QUEUE
-- ============================================
-- In-app annual social planning for chefs.
-- Stores a full-year content bank and supports rolling exports
-- based on platform scheduling windows.
-- ============================================

CREATE TYPE social_post_status AS ENUM (
  'idea',
  'draft',
  'approved',
  'queued',
  'published',
  'archived'
);
CREATE TYPE social_pillar AS ENUM (
  'recipe',
  'behind_scenes',
  'education',
  'social_proof',
  'offers',
  'seasonal'
);
CREATE TYPE social_media_type AS ENUM (
  'image',
  'video',
  'carousel',
  'text'
);
CREATE TYPE social_platform AS ENUM (
  'instagram',
  'facebook',
  'tiktok',
  'linkedin',
  'x',
  'pinterest',
  'youtube_shorts'
);
CREATE TABLE social_queue_settings (
  tenant_id UUID PRIMARY KEY REFERENCES chefs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  target_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INTEGER,
  posts_per_week SMALLINT NOT NULL DEFAULT 5,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  queue_days SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}'::SMALLINT[],
  queue_times TEXT[] NOT NULL DEFAULT '{11:00,13:00,11:00,13:00,11:00}'::TEXT[],
  holdout_slots_per_month SMALLINT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_queue_settings_target_year_valid CHECK (target_year BETWEEN 2020 AND 2100),
  CONSTRAINT social_queue_settings_posts_per_week_valid CHECK (posts_per_week BETWEEN 1 AND 14),
  CONSTRAINT social_queue_settings_holdout_valid CHECK (holdout_slots_per_month BETWEEN 0 AND 10),
  CONSTRAINT social_queue_settings_queue_days_size CHECK (cardinality(queue_days) BETWEEN 1 AND 7),
  CONSTRAINT social_queue_settings_queue_time_size CHECK (cardinality(queue_times) BETWEEN 1 AND 7),
  CONSTRAINT social_queue_settings_queue_shape CHECK (cardinality(queue_days) = cardinality(queue_times)),
  CONSTRAINT social_queue_settings_queue_days_range CHECK (
    queue_days <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[]
  )
);
COMMENT ON TABLE social_queue_settings IS
  'Per-tenant defaults for annual social content planning and rolling queue cadence.';
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  updated_by UUID,
  post_code TEXT NOT NULL,
  target_year INTEGER NOT NULL,
  week_number SMALLINT NOT NULL,
  slot_number SMALLINT NOT NULL,
  schedule_at TIMESTAMPTZ NOT NULL,
  editable_until TIMESTAMPTZ,
  pillar social_pillar NOT NULL,
  status social_post_status NOT NULL DEFAULT 'idea',
  media_type social_media_type NOT NULL DEFAULT 'image',
  title TEXT NOT NULL DEFAULT '',
  caption_master TEXT NOT NULL DEFAULT '',
  caption_instagram TEXT NOT NULL DEFAULT '',
  caption_facebook TEXT NOT NULL DEFAULT '',
  caption_tiktok TEXT NOT NULL DEFAULT '',
  caption_linkedin TEXT NOT NULL DEFAULT '',
  caption_x TEXT NOT NULL DEFAULT '',
  caption_pinterest TEXT NOT NULL DEFAULT '',
  caption_youtube_shorts TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  cta TEXT NOT NULL DEFAULT '',
  offer_link TEXT,
  media_url TEXT,
  platforms social_platform[] NOT NULL DEFAULT '{instagram,facebook,tiktok,linkedin,pinterest,youtube_shorts}'::social_platform[],
  campaign TEXT NOT NULL DEFAULT '',
  seasonal_flag BOOLEAN NOT NULL DEFAULT false,
  hot_swap_ready BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  queued_to_platforms social_platform[] NOT NULL DEFAULT '{}'::social_platform[],
  published_to_platforms social_platform[] NOT NULL DEFAULT '{}'::social_platform[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_posts_target_year_valid CHECK (target_year BETWEEN 2020 AND 2100),
  CONSTRAINT social_posts_week_valid CHECK (week_number BETWEEN 1 AND 53),
  CONSTRAINT social_posts_slot_valid CHECK (slot_number BETWEEN 1 AND 7),
  CONSTRAINT social_posts_title_length CHECK (char_length(title) <= 140),
  CONSTRAINT social_posts_editable_before_schedule CHECK (
    editable_until IS NULL OR editable_until <= schedule_at
  ),
  CONSTRAINT social_posts_unique_code_per_tenant UNIQUE (tenant_id, post_code),
  CONSTRAINT social_posts_unique_slot_per_tenant_year UNIQUE (tenant_id, target_year, week_number, slot_number)
);
COMMENT ON TABLE social_posts IS
  'Annual social content vault rows with platform variants and queue state for each scheduled slot.';
COMMENT ON COLUMN social_posts.post_code IS
  'Human-readable slot id (for example 2026-W14-P3).';
CREATE INDEX idx_social_posts_tenant_schedule
  ON social_posts (tenant_id, schedule_at ASC);
CREATE INDEX idx_social_posts_tenant_status_schedule
  ON social_posts (tenant_id, status, schedule_at ASC);
CREATE INDEX idx_social_posts_tenant_hot_swap
  ON social_posts (tenant_id, hot_swap_ready, schedule_at ASC);
CREATE INDEX idx_social_posts_platforms
  ON social_posts USING GIN (platforms);
CREATE TRIGGER social_queue_settings_updated_at
  BEFORE UPDATE ON social_queue_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE social_queue_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_queue_settings_select_own ON social_queue_settings
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY social_queue_settings_insert_own ON social_queue_settings
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND created_by = auth.uid()
  );
CREATE POLICY social_queue_settings_update_own ON social_queue_settings
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY social_posts_select_own ON social_posts
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY social_posts_insert_own ON social_posts
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND created_by = auth.uid()
  );
CREATE POLICY social_posts_update_own ON social_posts
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY social_posts_delete_own ON social_posts
  FOR DELETE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
