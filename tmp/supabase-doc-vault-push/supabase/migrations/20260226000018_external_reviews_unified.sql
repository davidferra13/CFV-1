-- ============================================
-- ChefFlow V1 - External Review Sources + Unified External Review Store
-- Safe review aggregation foundation (API + owned-site JSON-LD only)
-- ============================================

CREATE TABLE IF NOT EXISTS external_review_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  provider TEXT NOT NULL CHECK (provider IN ('google_places', 'website_jsonld')),
  label TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  active BOOLEAN NOT NULL DEFAULT true,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 360 CHECK (sync_interval_minutes >= 15),
  last_synced_at TIMESTAMPTZ,
  last_cursor TEXT,
  last_error TEXT,

  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_external_review_source_label UNIQUE (tenant_id, label)
);
CREATE INDEX IF NOT EXISTS idx_external_review_sources_tenant_active
  ON external_review_sources(tenant_id, active, provider);
COMMENT ON TABLE external_review_sources IS
  'Configured external review connectors per chef tenant. Supports Google Places API and owned-site JSON-LD review parsing.';
CREATE TABLE IF NOT EXISTS external_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES external_review_sources(id) ON DELETE CASCADE,

  provider TEXT NOT NULL CHECK (provider IN ('google_places', 'website_jsonld')),
  source_review_id TEXT NOT NULL,
  source_url TEXT,

  author_name TEXT,
  rating NUMERIC(3,2) CHECK (rating IS NULL OR (rating > 0 AND rating <= 5)),
  review_text TEXT NOT NULL,
  review_date DATE,

  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_external_reviews_source UNIQUE (tenant_id, provider, source_review_id)
);
CREATE INDEX IF NOT EXISTS idx_external_reviews_tenant_date
  ON external_reviews(tenant_id, review_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_reviews_source
  ON external_reviews(source_id, last_seen_at DESC);
COMMENT ON TABLE external_reviews IS
  'Normalized external reviews with source attribution and direct links for unified portal display.';
ALTER TABLE external_review_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chefs manage own external review sources" ON external_review_sources;
CREATE POLICY "Chefs manage own external review sources"
  ON external_review_sources
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS "Chefs manage own external reviews" ON external_reviews;
CREATE POLICY "Chefs manage own external reviews"
  ON external_reviews
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS "Service role manages external review sources" ON external_review_sources;
CREATE POLICY "Service role manages external review sources"
  ON external_review_sources
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role manages external reviews" ON external_reviews;
CREATE POLICY "Service role manages external reviews"
  ON external_reviews
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
DROP TRIGGER IF EXISTS trg_external_review_sources_updated_at ON external_review_sources;
CREATE TRIGGER trg_external_review_sources_updated_at
  BEFORE UPDATE ON external_review_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_external_reviews_updated_at ON external_reviews;
CREATE TRIGGER trg_external_reviews_updated_at
  BEFORE UPDATE ON external_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
