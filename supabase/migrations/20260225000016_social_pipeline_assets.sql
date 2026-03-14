-- ============================================
-- SOCIAL PIPELINE EXTENSION: MEDIA VAULT + PREFLIGHT
-- ============================================

CREATE TYPE social_asset_kind AS ENUM (
  'image',
  'video'
);

ALTER TABLE social_posts
  ADD COLUMN mention_handles TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN collaborator_tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN location_tag TEXT NOT NULL DEFAULT '',
  ADD COLUMN alt_text TEXT NOT NULL DEFAULT '',
  ADD COLUMN thumbnail_time_seconds INTEGER,
  ADD COLUMN thumbnail_url TEXT,
  ADD COLUMN publish_checklist_notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN preflight_ready BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN preflight_missing_items TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD CONSTRAINT social_posts_thumbnail_seconds_valid
    CHECK (thumbnail_time_seconds IS NULL OR thumbnail_time_seconds BETWEEN 0 AND 3600);

CREATE TABLE social_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  updated_by UUID,
  asset_kind social_asset_kind NOT NULL,
  asset_name TEXT NOT NULL DEFAULT '',
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  width_px INTEGER,
  height_px INTEGER,
  asset_tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  usage_context TEXT NOT NULL DEFAULT '',
  is_client_approved BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_media_assets_file_size_valid CHECK (file_size_bytes >= 0),
  CONSTRAINT social_media_assets_duration_valid CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT social_media_assets_dimensions_valid CHECK (
    (width_px IS NULL OR width_px >= 0)
    AND (height_px IS NULL OR height_px >= 0)
  )
);

CREATE INDEX idx_social_media_assets_tenant_created
  ON social_media_assets (tenant_id, created_at DESC);

CREATE INDEX idx_social_media_assets_tenant_archived
  ON social_media_assets (tenant_id, is_archived, created_at DESC);

CREATE INDEX idx_social_media_assets_tags
  ON social_media_assets USING GIN (asset_tags);

CREATE TABLE social_post_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES social_media_assets(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order SMALLINT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_post_assets_display_order_valid CHECK (display_order >= 1),
  CONSTRAINT social_post_assets_unique UNIQUE (tenant_id, post_id, asset_id)
);

CREATE INDEX idx_social_post_assets_tenant_post
  ON social_post_assets (tenant_id, post_id, display_order ASC);

CREATE INDEX idx_social_post_assets_tenant_asset
  ON social_post_assets (tenant_id, asset_id);

CREATE UNIQUE INDEX idx_social_post_assets_primary_per_post
  ON social_post_assets (tenant_id, post_id)
  WHERE is_primary = true;

CREATE TRIGGER social_media_assets_updated_at
  BEFORE UPDATE ON social_media_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE social_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_media_assets_select_own ON social_media_assets
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

CREATE POLICY social_media_assets_insert_own ON social_media_assets
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND created_by = auth.uid()
  );

CREATE POLICY social_media_assets_update_own ON social_media_assets
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

CREATE POLICY social_media_assets_delete_own ON social_media_assets
  FOR DELETE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

CREATE POLICY social_post_assets_select_own ON social_post_assets
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

CREATE POLICY social_post_assets_insert_own ON social_post_assets
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND created_by = auth.uid()
  );

CREATE POLICY social_post_assets_update_own ON social_post_assets
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

CREATE POLICY social_post_assets_delete_own ON social_post_assets
  FOR DELETE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-media-vault',
  'social-media-vault',
  true,
  104857600,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
