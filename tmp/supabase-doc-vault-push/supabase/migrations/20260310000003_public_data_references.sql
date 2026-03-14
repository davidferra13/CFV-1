-- ============================================================
-- Public Data Reference Storage
-- Stores normalized external data snapshots used by the app.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.public_data_source_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  endpoint TEXT,
  lookup_key TEXT,
  status TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'error', 'stale', 'miss')),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  freshness_expires_at TIMESTAMPTZ,
  record_count INTEGER,
  latency_ms INTEGER,
  error_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_public_data_source_logs_source_fetched
  ON public.public_data_source_logs (source_name, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_data_source_logs_lookup_fetched
  ON public.public_data_source_logs (lookup_key, fetched_at DESC);
ALTER TABLE public.public_data_source_logs ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.public_ingredient_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  matched_name TEXT,
  source_name TEXT NOT NULL,
  source_record_id TEXT,
  allergen_flags TEXT[] NOT NULL DEFAULT '{}',
  nutrition JSONB,
  freshness_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_ingredient_references_source
  ON public.public_ingredient_references (source_name, updated_at DESC);
ALTER TABLE public.public_ingredient_references ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.public_product_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  brand_name TEXT,
  source_name TEXT NOT NULL,
  source_record_id TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  allergen_flags TEXT[] NOT NULL DEFAULT '{}',
  nutrition JSONB,
  packaging JSONB,
  image_url TEXT,
  freshness_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_product_references_source
  ON public.public_product_references (source_name, updated_at DESC);
ALTER TABLE public.public_product_references ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.public_location_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_key TEXT NOT NULL UNIQUE,
  input_address TEXT NOT NULL,
  normalized_address TEXT,
  matched_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  county TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  source_name TEXT NOT NULL,
  source_record_id TEXT,
  freshness_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_location_references_coords
  ON public.public_location_references (lat, lng);
CREATE INDEX IF NOT EXISTS idx_public_location_references_state_city
  ON public.public_location_references (state, city);
ALTER TABLE public.public_location_references ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.public_weather_risk_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_key TEXT NOT NULL UNIQUE,
  location_label TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  risk_level TEXT NOT NULL
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  reasons TEXT[] NOT NULL DEFAULT '{}',
  alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
  air_quality JSONB,
  source_names TEXT[] NOT NULL DEFAULT '{}',
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  freshness_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_weather_risk_snapshots_coords
  ON public.public_weather_risk_snapshots (lat, lng);
CREATE INDEX IF NOT EXISTS idx_public_weather_risk_snapshots_snapshot_at
  ON public.public_weather_risk_snapshots (snapshot_at DESC);
ALTER TABLE public.public_weather_risk_snapshots ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.public_food_recall_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_number TEXT NOT NULL UNIQUE,
  product_description TEXT NOT NULL,
  classification TEXT,
  status TEXT,
  report_date TEXT,
  reason_for_recall TEXT,
  recalling_firm TEXT,
  distribution_pattern TEXT,
  source_name TEXT NOT NULL,
  freshness_expires_at TIMESTAMPTZ,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_food_recall_snapshots_status
  ON public.public_food_recall_snapshots (status, updated_at DESC);
ALTER TABLE public.public_food_recall_snapshots ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.update_public_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_public_ingredient_references_updated_at
  ON public.public_ingredient_references;
CREATE TRIGGER trg_public_ingredient_references_updated_at
  BEFORE UPDATE ON public.public_ingredient_references
  FOR EACH ROW
  EXECUTE FUNCTION public.update_public_data_updated_at();
DROP TRIGGER IF EXISTS trg_public_product_references_updated_at
  ON public.public_product_references;
CREATE TRIGGER trg_public_product_references_updated_at
  BEFORE UPDATE ON public.public_product_references
  FOR EACH ROW
  EXECUTE FUNCTION public.update_public_data_updated_at();
DROP TRIGGER IF EXISTS trg_public_location_references_updated_at
  ON public.public_location_references;
CREATE TRIGGER trg_public_location_references_updated_at
  BEFORE UPDATE ON public.public_location_references
  FOR EACH ROW
  EXECUTE FUNCTION public.update_public_data_updated_at();
DROP TRIGGER IF EXISTS trg_public_weather_risk_snapshots_updated_at
  ON public.public_weather_risk_snapshots;
CREATE TRIGGER trg_public_weather_risk_snapshots_updated_at
  BEFORE UPDATE ON public.public_weather_risk_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_public_data_updated_at();
DROP TRIGGER IF EXISTS trg_public_food_recall_snapshots_updated_at
  ON public.public_food_recall_snapshots;
CREATE TRIGGER trg_public_food_recall_snapshots_updated_at
  BEFORE UPDATE ON public.public_food_recall_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_public_data_updated_at();
CREATE OR REPLACE FUNCTION public.purge_old_public_data_source_logs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.public_data_source_logs
  WHERE fetched_at < NOW() - INTERVAL '90 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_public_data_source_logs_purge
  ON public.public_data_source_logs;
CREATE TRIGGER trg_public_data_source_logs_purge
  AFTER INSERT ON public.public_data_source_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.purge_old_public_data_source_logs();
