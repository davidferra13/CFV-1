-- Migration: Social Platform Credentials
-- Stores OAuth tokens for social media platform connections.
-- Tokens are AES-256-GCM encrypted at the application layer before storage.
-- One row per chef per platform (upserted on reconnect).
-- All changes are purely additive — no existing data is touched.

-- ============================================================
-- 1. Platform credentials table
-- ============================================================

CREATE TABLE IF NOT EXISTS social_platform_credentials (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  platform                    TEXT        NOT NULL,

  -- Account info (populated during OAuth callback)
  external_account_id         TEXT        NOT NULL,       -- IG user ID, page ID, LinkedIn sub, etc.
  external_account_name       TEXT,                       -- Display name
  external_account_username   TEXT,                       -- @handle or slug
  external_account_avatar_url TEXT,

  -- Encrypted tokens (AES-256-GCM, format: iv:authTag:ciphertext, all base64)
  access_token                TEXT        NOT NULL,
  refresh_token               TEXT,                       -- null for platforms without refresh tokens
  token_expires_at            TIMESTAMPTZ,                -- null = non-expiring token

  -- Platform-specific metadata (page tokens for Meta, board IDs for Pinterest, etc.)
  additional_data             JSONB       NOT NULL DEFAULT '{}'::JSONB,

  scopes                      TEXT[]      NOT NULL DEFAULT '{}',

  -- Health tracking
  is_active                   BOOLEAN     NOT NULL DEFAULT true,
  last_used_at                TIMESTAMPTZ,
  last_error                  TEXT,
  failed_attempts             SMALLINT    NOT NULL DEFAULT 0,

  -- Lifecycle
  connected_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at             TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT social_platform_credentials_platform_check CHECK (
    platform IN ('instagram', 'facebook', 'tiktok', 'linkedin', 'x', 'pinterest', 'youtube_shorts')
  ),

  -- One active connection per platform per chef (reconnect upserts this row)
  CONSTRAINT social_platform_credentials_unique UNIQUE (tenant_id, platform)
);

-- ============================================================
-- 2. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS social_platform_credentials_tenant_idx
  ON social_platform_credentials (tenant_id, platform);

CREATE INDEX IF NOT EXISTS social_platform_credentials_active_idx
  ON social_platform_credentials (tenant_id)
  WHERE is_active = true;

-- For the token-refresh sweep in the publishing cron
CREATE INDEX IF NOT EXISTS social_platform_credentials_expiry_idx
  ON social_platform_credentials (token_expires_at ASC)
  WHERE is_active = true AND token_expires_at IS NOT NULL;

-- ============================================================
-- 3. Auto-update updated_at
-- ============================================================

CREATE TRIGGER social_platform_credentials_updated_at
  BEFORE UPDATE ON social_platform_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. RLS
-- Chefs can SELECT their own rows.
-- All writes (INSERT/UPDATE/DELETE) use the service role in server-side routes.
-- ============================================================

ALTER TABLE social_platform_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_social_credentials_select" ON social_platform_credentials;
CREATE POLICY "chef_social_credentials_select"
  ON social_platform_credentials FOR SELECT
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

-- ============================================================
-- 5. Comments
-- ============================================================

COMMENT ON TABLE social_platform_credentials IS
  'OAuth tokens for social media platform connections. Tokens are AES-256-GCM encrypted at the application layer before storage.';

COMMENT ON COLUMN social_platform_credentials.access_token IS
  'Encrypted OAuth access token. Format: iv:authTag:ciphertext (all base64). Decrypt server-side using SOCIAL_TOKEN_ENCRYPTION_KEY.';

COMMENT ON COLUMN social_platform_credentials.refresh_token IS
  'Encrypted OAuth refresh token, same format. Null for platforms without refresh tokens (Meta long-lived user tokens, Pinterest).';

COMMENT ON COLUMN social_platform_credentials.additional_data IS
  'Platform-specific metadata: { page_id, page_access_token } for Facebook; { instagram_user_id, facebook_page_id } for Instagram; { open_id } for TikTok; { urn } for LinkedIn; { default_board_id } for Pinterest; { channel_id } for YouTube.';

COMMENT ON COLUMN social_platform_credentials.failed_attempts IS
  'Consecutive failed publish attempts from this credential. Reset to 0 after first success. Chef is notified when this reaches 3.';
