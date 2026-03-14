-- Migration: Social Connected Accounts
-- Stores OAuth tokens and account metadata for each social platform a chef connects.
-- Used by Phase 2 (connect UI) and Phase 3 (publishing cron).
--
-- Design decisions:
--   - One active row per (tenant_id, platform) pair — enforced by partial unique index.
--   - Tokens are stored server-side only. RLS allows chefs to SELECT their own rows
--     (so the UI can show "Connected as @handle"), but INSERT/UPDATE/DELETE are service-role-only
--     (handled by API routes, never by client components).
--   - The access_token and refresh_token columns should never be sent to the browser.
--     Server actions that feed the UI always omit those columns in SELECT.
--   - Meta uses a shared OAuth app for both Instagram and Facebook, so one row per
--     sub-platform (instagram | facebook) allows independent revocation.
--
-- This migration is purely additive — no existing tables or data are touched.

-- ============================================================
-- 1. Main table
-- ============================================================

CREATE TABLE IF NOT EXISTS social_connected_accounts (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Which platform this connection is for.
  -- Matches the social_platform enum values (text so this table stays decoupled).
  platform               TEXT        NOT NULL
    CHECK (platform IN ('instagram','facebook','tiktok','linkedin','x','pinterest','youtube_shorts')),

  -- ── OAuth tokens ──────────────────────────────────────────
  -- Never serialised to the browser. Server actions SELECT only non-token columns.
  access_token           TEXT        NOT NULL,
  refresh_token          TEXT,
  token_expires_at       TIMESTAMPTZ,

  -- Scopes actually granted by the user (platform may grant fewer than requested)
  granted_scopes         TEXT[]      NOT NULL DEFAULT '{}',

  -- ── Platform account info (safe to show in UI) ─────────────
  platform_account_id    TEXT        NOT NULL,     -- opaque platform user/page ID
  platform_account_name  TEXT,                     -- display name, e.g. "David's Kitchen"
  platform_account_handle TEXT,                    -- @username where applicable
  platform_account_type  TEXT,                     -- 'personal' | 'business' | 'creator' | 'page'
  platform_account_avatar TEXT,                    -- public avatar URL (may expire for some platforms)

  -- ── Meta-specific: Facebook Page & linked IG business account ──
  -- When connecting Meta, the chef chooses which FB Page to post to.
  -- That page may have a linked Instagram Business account.
  meta_page_id           TEXT,
  meta_page_name         TEXT,
  meta_ig_account_id     TEXT,       -- Instagram Business Account ID (for IG publishing)

  -- ── Status & health ──────────────────────────────────────
  is_active              BOOLEAN     NOT NULL DEFAULT true,
  last_used_at           TIMESTAMPTZ,
  last_error             TEXT,
  error_count            INT         NOT NULL DEFAULT 0,

  -- ── Timestamps ───────────────────────────────────────────
  connected_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_refreshed_at      TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ── Comments ───────────────────────────────────────────────

COMMENT ON TABLE  social_connected_accounts IS 'Stores OAuth credentials and account metadata for each social platform a chef has connected. Tokens are never sent to the browser.';
COMMENT ON COLUMN social_connected_accounts.access_token      IS 'OAuth access token. Server-side only — never serialised to client.';
COMMENT ON COLUMN social_connected_accounts.refresh_token     IS 'OAuth refresh token if issued by platform. Server-side only.';
COMMENT ON COLUMN social_connected_accounts.token_expires_at  IS 'UTC timestamp when access_token expires. Null = non-expiring (rare).';
COMMENT ON COLUMN social_connected_accounts.granted_scopes    IS 'Scopes the user actually granted. May be a subset of requested scopes.';
COMMENT ON COLUMN social_connected_accounts.platform_account_id IS 'Opaque platform user or page ID. Used to identify the account when calling APIs.';
COMMENT ON COLUMN social_connected_accounts.meta_ig_account_id IS 'Instagram Business Account ID linked to the chosen Facebook Page. Only populated for the instagram row.';
COMMENT ON COLUMN social_connected_accounts.error_count       IS 'Incremented on each publish failure. Reset to 0 on successful publish or token refresh.';
-- ── Indexes ────────────────────────────────────────────────

-- One active connection per platform per chef
CREATE UNIQUE INDEX IF NOT EXISTS sca_tenant_platform_active_idx
  ON social_connected_accounts (tenant_id, platform)
  WHERE is_active = true;
-- For Phase 3 cron: quickly look up a token by (tenant_id, platform)
CREATE INDEX IF NOT EXISTS sca_tenant_platform_idx
  ON social_connected_accounts (tenant_id, platform);
-- Auto-update updated_at
CREATE TRIGGER social_connected_accounts_updated_at
  BEFORE UPDATE ON social_connected_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================
-- 2. Row Level Security
-- ============================================================
-- Chefs can SELECT their own connections (to see connected status / account name).
-- INSERT, UPDATE, DELETE are service-role-only (done in API routes using
-- createAdminClient() which bypasses RLS with the service role key).

ALTER TABLE social_connected_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chef_sca_select"
  ON social_connected_accounts FOR SELECT
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
-- No INSERT/UPDATE/DELETE policies — only service role via createAdminClient() writes here.

-- ============================================================
-- 3. Cleanup function for expired OAuth states (runs in Phase 3 cron)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_social_oauth_states()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM social_oauth_states WHERE expires_at < now();
$$;
COMMENT ON FUNCTION cleanup_expired_social_oauth_states() IS 'Called by the Phase 3 cron to purge stale OAuth PKCE state rows.';
