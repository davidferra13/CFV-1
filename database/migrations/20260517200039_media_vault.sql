-- Event Media Vault: 4-tier media management with consent tracking
-- ADDITIVE ONLY. No drops, no deletes, no column modifications.

-- ─── media_vault_assets ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_vault_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL,
  tier              TEXT NOT NULL DEFAULT 'raw',
  media_type        TEXT NOT NULL DEFAULT 'photo',
  file_path         TEXT,
  external_url      TEXT,
  thumbnail_path    TEXT,
  caption           TEXT,
  tags              JSONB NOT NULL DEFAULT '[]'::jsonb,
  dish_name         TEXT,
  course_name       TEXT,
  venue_address     TEXT,
  social_platform   TEXT,
  social_caption    TEXT,
  social_post_date  TIMESTAMPTZ,
  annotation        TEXT,
  source_attribution TEXT,
  display_order     INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT mva_tier_check CHECK (tier IN ('raw', 'curated', 'polished', 'published')),
  CONSTRAINT mva_media_type_check CHECK (media_type IN ('photo', 'video', 'social_post')),
  CONSTRAINT mva_has_content CHECK (file_path IS NOT NULL OR external_url IS NOT NULL)
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_mva_event_tenant
  ON media_vault_assets(event_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_mva_tenant_tier
  ON media_vault_assets(tenant_id, tier);

CREATE INDEX IF NOT EXISTS idx_mva_tenant_dish
  ON media_vault_assets(tenant_id, dish_name)
  WHERE dish_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mva_tenant_venue
  ON media_vault_assets(tenant_id, venue_address)
  WHERE venue_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mva_tenant_type
  ON media_vault_assets(tenant_id, media_type);

-- RLS
ALTER TABLE media_vault_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY mva_tenant_isolation ON media_vault_assets
  FOR ALL TO public
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
  ))
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
  ));

CREATE POLICY mva_service_role ON media_vault_assets
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE media_vault_assets IS 'Event media vault: photos, videos, social posts organized in 4 tiers (raw/curated/polished/published).';

-- ─── media_consents ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_consents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  guest_id    UUID REFERENCES event_guests(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'private_only',
  notes       TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT mc_status_check CHECK (status IN ('no_photos', 'private_only', 'portfolio_ok', 'social_ok'))
);

-- One event-level consent per event (guest_id IS NULL), one per guest
CREATE UNIQUE INDEX IF NOT EXISTS idx_mc_event_tenant_guest
  ON media_consents(event_id, tenant_id, COALESCE(guest_id, '00000000-0000-0000-0000-000000000000'));

CREATE INDEX IF NOT EXISTS idx_mc_tenant
  ON media_consents(tenant_id);

-- RLS
ALTER TABLE media_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY mc_tenant_isolation ON media_consents
  FOR ALL TO public
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
  ))
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
  ));

CREATE POLICY mc_service_role ON media_consents
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE media_consents IS 'Per-event and per-guest media consent tracking (no_photos/private_only/portfolio_ok/social_ok).';
