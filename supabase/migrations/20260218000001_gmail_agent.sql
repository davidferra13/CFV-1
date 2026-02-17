-- ============================================================================
-- Gmail AI Agent — Phase 1
-- Creates google_connections, gmail_sync_log, and adds Gmail columns to messages
-- ============================================================================

-- ─── Google Connections ─────────────────────────────────────────────────────
-- One row per chef — stores OAuth tokens and sync state for Google services.

CREATE TABLE google_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- OAuth tokens (encrypted at rest by Supabase)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_email TEXT,

  -- Service flags
  gmail_connected BOOLEAN NOT NULL DEFAULT false,
  calendar_connected BOOLEAN NOT NULL DEFAULT false,
  scopes TEXT[] NOT NULL DEFAULT '{}',

  -- Gmail sync state
  gmail_history_id TEXT,
  gmail_last_sync_at TIMESTAMPTZ,
  gmail_sync_errors INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_chef_google UNIQUE (chef_id)
);

-- Index for cron: find all gmail-connected chefs quickly
CREATE INDEX idx_google_connections_gmail_active
  ON google_connections(gmail_connected) WHERE gmail_connected = true;

-- ─── Gmail columns on messages ──────────────────────────────────────────────
-- For deduplication and thread tracking

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS gmail_message_id TEXT,
  ADD COLUMN IF NOT EXISTS gmail_thread_id TEXT;

CREATE UNIQUE INDEX idx_messages_gmail_dedup
  ON messages(tenant_id, gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;

-- ─── Gmail Sync Log ─────────────────────────────────────────────────────────
-- Audit trail: every email processed gets a log entry, regardless of classification.

CREATE TABLE gmail_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT,
  from_address TEXT,
  subject TEXT,
  classification TEXT NOT NULL,
  confidence TEXT NOT NULL,
  action_taken TEXT,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  error TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_gmail_sync UNIQUE (tenant_id, gmail_message_id)
);

CREATE INDEX idx_gmail_sync_log_tenant ON gmail_sync_log(tenant_id, synced_at DESC);

-- ─── RLS Policies ───────────────────────────────────────────────────────────

ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_sync_log ENABLE ROW LEVEL SECURITY;

-- google_connections: chefs can read/write only their own row
CREATE POLICY "Chefs manage own google connection"
  ON google_connections
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

-- gmail_sync_log: chefs can read their own tenant logs
CREATE POLICY "Chefs read own gmail sync log"
  ON gmail_sync_log
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Service role can insert/update gmail_sync_log (for cron endpoint)
CREATE POLICY "Service role manages gmail sync log"
  ON gmail_sync_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Service role can manage google_connections (for token refresh in cron)
CREATE POLICY "Service role manages google connections"
  ON google_connections
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── Updated_at trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_google_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_google_connections_updated_at
  BEFORE UPDATE ON google_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_google_connections_updated_at();
