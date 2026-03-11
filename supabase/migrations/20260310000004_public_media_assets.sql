-- ============================================================
-- Public Media Asset Storage
-- Stores normalized, licensed public media candidates used for
-- placeholders and editorial image enrichment.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.public_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_key TEXT NOT NULL UNIQUE,
  search_query TEXT,
  title TEXT NOT NULL,
  alt_text TEXT,
  source_name TEXT NOT NULL,
  source_record_id TEXT,
  provider_name TEXT NOT NULL,
  provider_url TEXT,
  asset_url TEXT NOT NULL,
  thumbnail_url TEXT,
  landing_url TEXT,
  creator_name TEXT,
  creator_url TEXT,
  license_name TEXT,
  license_url TEXT,
  attribution_text TEXT,
  usage_restrictions TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  dominant_color TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('approved', 'pending', 'rejected')),
  freshness_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_media_assets_search_query
  ON public.public_media_assets (search_query, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_media_assets_approval
  ON public.public_media_assets (approval_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_media_assets_source
  ON public.public_media_assets (source_name, updated_at DESC);
ALTER TABLE public.public_media_assets ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_public_media_assets_updated_at
  ON public.public_media_assets;
CREATE TRIGGER trg_public_media_assets_updated_at
  BEFORE UPDATE ON public.public_media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_public_data_updated_at();
