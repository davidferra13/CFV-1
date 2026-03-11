-- ============================================================================
-- Integration Core Foundation + Public Website Profile Controls
-- Date: 2026-02-24
-- Purpose:
-- 1) Add integration platform foundation tables/enums
-- 2) Add chef website fields for public profile display and inquiry destination
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_provider') THEN
    CREATE TYPE integration_provider AS ENUM (
      'square',
      'shopify_pos',
      'clover',
      'toast',
      'lightspeed',
      'calendly',
      'google_calendar',
      'hubspot',
      'salesforce',
      'wix',
      'gmail',
      'custom_webhook',
      'csv_import'
    );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_auth_type') THEN
    CREATE TYPE integration_auth_type AS ENUM (
      'oauth2',
      'api_key',
      'pat',
      'none'
    );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_status') THEN
    CREATE TYPE integration_status AS ENUM (
      'connected',
      'disconnected',
      'error',
      'reauth_required'
    );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_sync_status') THEN
    CREATE TYPE integration_sync_status AS ENUM (
      'pending',
      'processing',
      'completed',
      'failed',
      'duplicate'
    );
  END IF;
END
$$;
-- ----------------------------------------------------------------------------
-- Profile controls on chefs table
-- ----------------------------------------------------------------------------

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS show_website_on_public_profile BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS preferred_inquiry_destination TEXT NOT NULL DEFAULT 'both'
    CHECK (preferred_inquiry_destination IN ('website_only', 'chefflow_only', 'both'));
COMMENT ON COLUMN chefs.website_url IS
  'Chef official website URL shown on profile when enabled.';
COMMENT ON COLUMN chefs.show_website_on_public_profile IS
  'When true and website_url is set, display external website link on public chef profile.';
COMMENT ON COLUMN chefs.preferred_inquiry_destination IS
  'Lead routing preference: website_only | chefflow_only | both.';
-- ----------------------------------------------------------------------------
-- Integration tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  provider integration_provider NOT NULL,
  auth_type integration_auth_type NOT NULL DEFAULT 'none',
  status integration_status NOT NULL DEFAULT 'connected',

  external_account_id TEXT,
  external_account_name TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',

  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  api_key TEXT,
  webhook_secret TEXT,

  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_connections_external
  ON integration_connections(tenant_id, provider, external_account_id)
  WHERE external_account_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_connections_provider_singleton
  ON integration_connections(tenant_id, provider)
  WHERE external_account_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_integration_connections_tenant
  ON integration_connections(tenant_id, provider);
CREATE TABLE IF NOT EXISTS integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES integration_connections(id) ON DELETE SET NULL,

  provider integration_provider NOT NULL,
  source_event_id TEXT NOT NULL,
  source_event_type TEXT NOT NULL,
  canonical_event_type TEXT,

  external_entity_type TEXT,
  external_entity_id TEXT,

  occurred_at TIMESTAMPTZ,
  raw_payload JSONB NOT NULL,
  normalized_payload JSONB,

  status integration_sync_status NOT NULL DEFAULT 'pending',
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,

  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,

  CONSTRAINT uq_integration_events_source UNIQUE (tenant_id, provider, source_event_id)
);
CREATE INDEX IF NOT EXISTS idx_integration_events_pending
  ON integration_events(status, received_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_integration_events_tenant_provider
  ON integration_events(tenant_id, provider, received_at DESC);
CREATE TABLE IF NOT EXISTS integration_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES integration_connections(id) ON DELETE SET NULL,

  provider integration_provider NOT NULL,
  job_type TEXT NOT NULL
    CHECK (job_type IN ('webhook_process', 'pull_incremental', 'replay')),

  cursor_before TEXT,
  cursor_after TEXT,

  status integration_sync_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_status
  ON integration_sync_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_tenant_provider
  ON integration_sync_jobs(tenant_id, provider, created_at DESC);
CREATE TABLE IF NOT EXISTS integration_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,

  external_entity_type TEXT NOT NULL,
  external_entity_id TEXT NOT NULL,

  local_entity_type TEXT NOT NULL
    CHECK (local_entity_type IN ('client', 'inquiry', 'event', 'quote', 'payment')),
  local_entity_id UUID NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_integration_entity_links UNIQUE (
    tenant_id,
    provider,
    external_entity_type,
    external_entity_id
  )
);
CREATE INDEX IF NOT EXISTS idx_integration_entity_links_local
  ON integration_entity_links(tenant_id, local_entity_type, local_entity_id);
CREATE TABLE IF NOT EXISTS integration_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  connection_id UUID REFERENCES integration_connections(id) ON DELETE CASCADE,

  mapping_name TEXT NOT NULL,
  external_path TEXT NOT NULL,
  local_field TEXT NOT NULL,
  transform_rule TEXT,

  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_integration_field_mappings UNIQUE (
    tenant_id,
    provider,
    mapping_name,
    external_path,
    local_field
  )
);
CREATE INDEX IF NOT EXISTS idx_integration_field_mappings_lookup
  ON integration_field_mappings(tenant_id, provider, active);
-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_integration_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_integration_connections_updated_at ON integration_connections;
CREATE TRIGGER trg_integration_connections_updated_at
  BEFORE UPDATE ON integration_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_updated_at_column();
DROP TRIGGER IF EXISTS trg_integration_entity_links_updated_at ON integration_entity_links;
CREATE TRIGGER trg_integration_entity_links_updated_at
  BEFORE UPDATE ON integration_entity_links
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_updated_at_column();
DROP TRIGGER IF EXISTS trg_integration_field_mappings_updated_at ON integration_field_mappings;
CREATE TRIGGER trg_integration_field_mappings_updated_at
  BEFORE UPDATE ON integration_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_updated_at_column();
-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_field_mappings ENABLE ROW LEVEL SECURITY;
-- integration_connections: chefs can manage own rows
DROP POLICY IF EXISTS "Chefs manage own integration connections" ON integration_connections;
CREATE POLICY "Chefs manage own integration connections"
  ON integration_connections
  FOR ALL
  USING (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- integration_events: chefs can read own tenant events
DROP POLICY IF EXISTS "Chefs read own integration events" ON integration_events;
CREATE POLICY "Chefs read own integration events"
  ON integration_events
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- integration_sync_jobs: chefs can read own tenant jobs
DROP POLICY IF EXISTS "Chefs read own integration sync jobs" ON integration_sync_jobs;
CREATE POLICY "Chefs read own integration sync jobs"
  ON integration_sync_jobs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- integration_entity_links: chefs can read own tenant links
DROP POLICY IF EXISTS "Chefs read own integration entity links" ON integration_entity_links;
CREATE POLICY "Chefs read own integration entity links"
  ON integration_entity_links
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- integration_field_mappings: chefs can manage own mappings
DROP POLICY IF EXISTS "Chefs manage own integration mappings" ON integration_field_mappings;
CREATE POLICY "Chefs manage own integration mappings"
  ON integration_field_mappings
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
-- service role policies
DROP POLICY IF EXISTS "Service role manages integration connections" ON integration_connections;
CREATE POLICY "Service role manages integration connections"
  ON integration_connections
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role manages integration events" ON integration_events;
CREATE POLICY "Service role manages integration events"
  ON integration_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role manages integration sync jobs" ON integration_sync_jobs;
CREATE POLICY "Service role manages integration sync jobs"
  ON integration_sync_jobs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role manages integration entity links" ON integration_entity_links;
CREATE POLICY "Service role manages integration entity links"
  ON integration_entity_links
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role manages integration field mappings" ON integration_field_mappings;
CREATE POLICY "Service role manages integration field mappings"
  ON integration_field_mappings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
