-- Inquiry Consolidation Phase 2: Infrastructure Tables
-- Adds: extended marketing_spend_log channels, platform_api_connections, client_merge_log
-- Purely additive. No existing tables or data are modified beyond the CHECK constraint update.

-- ============================================================
-- 1. EXTEND marketing_spend_log CHANNEL OPTIONS
-- ============================================================
-- Add marketplace platform channels alongside existing ad channels.
-- The existing CHECK constraint limits channels to ad types only.

ALTER TABLE marketing_spend_log DROP CONSTRAINT IF EXISTS marketing_spend_log_channel_check;
ALTER TABLE marketing_spend_log ADD CONSTRAINT marketing_spend_log_channel_check
  CHECK (channel IN (
    'instagram_ads', 'google_ads', 'facebook_ads', 'tiktok_ads',
    'print', 'event_sponsorship', 'other',
    'thumbtack', 'bark', 'theknot', 'cozymeal', 'gigsalad',
    'yhangry', 'take_a_chef', 'google_business',
    'privatechefmanager', 'hireachef', 'cuisineistchef'
  ));

-- ============================================================
-- 2. PLATFORM API CONNECTIONS
-- ============================================================
-- Stores OAuth/API credentials for marketplace platforms.
-- Foundation table: credentials stored, API calls deferred.

CREATE TABLE IF NOT EXISTS platform_api_connections (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id       UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  platform      TEXT        NOT NULL,
  credentials   JSONB       NOT NULL DEFAULT '{}',
  status        TEXT        NOT NULL DEFAULT 'disconnected'
                            CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  connected_at  TIMESTAMPTZ,
  last_sync_at  TIMESTAMPTZ,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pac_chef_platform_unique UNIQUE (chef_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_pac_chef ON platform_api_connections(chef_id);

CREATE TRIGGER pac_updated_at
  BEFORE UPDATE ON platform_api_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE platform_api_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_pac_select" ON platform_api_connections;
CREATE POLICY "chef_pac_select"
  ON platform_api_connections FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS "service_pac_all" ON platform_api_connections;
CREATE POLICY "service_pac_all"
  ON platform_api_connections FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE platform_api_connections IS
  'OAuth/API credentials for marketplace platforms (Thumbtack, Google Business, etc.). Foundation layer for future API integrations.';

-- ============================================================
-- 3. CLIENT MERGE LOG
-- ============================================================
-- Audit trail for client merge operations (cross-platform matching).

CREATE TABLE IF NOT EXISTS client_merge_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id          UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  kept_client_id   UUID        NOT NULL REFERENCES clients(id),
  merged_client_id UUID        NOT NULL,
  merge_details    JSONB       NOT NULL DEFAULT '{}',
  merged_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cml_chef ON client_merge_log(chef_id);
CREATE INDEX IF NOT EXISTS idx_cml_kept ON client_merge_log(kept_client_id);

ALTER TABLE client_merge_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_cml_select" ON client_merge_log;
CREATE POLICY "chef_cml_select"
  ON client_merge_log FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS "service_cml_all" ON client_merge_log;
CREATE POLICY "service_cml_all"
  ON client_merge_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE client_merge_log IS
  'Audit trail for cross-platform client merges. merged_client_id is a UUID (not FK) since the merged client gets soft-deleted.';
