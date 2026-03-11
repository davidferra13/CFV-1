-- Multi-mailbox Gmail support
-- Adds google_mailboxes as the source of truth for Gmail inboxes attached to a chef.
-- Keeps google_connections in place for legacy compatibility and Calendar.

CREATE TABLE IF NOT EXISTS google_mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  normalized_email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  gmail_connected BOOLEAN NOT NULL DEFAULT false,
  gmail_history_id TEXT,
  gmail_last_sync_at TIMESTAMPTZ,
  gmail_sync_errors INTEGER NOT NULL DEFAULT 0,
  historical_scan_enabled BOOLEAN NOT NULL DEFAULT false,
  historical_scan_include_spam_trash BOOLEAN NOT NULL DEFAULT true,
  historical_scan_status TEXT NOT NULL DEFAULT 'idle',
  historical_scan_page_token TEXT,
  historical_scan_total_processed INTEGER NOT NULL DEFAULT 0,
  historical_scan_total_seen INTEGER NOT NULL DEFAULT 0,
  historical_scan_result_size_estimate INTEGER,
  historical_scan_lookback_days INTEGER NOT NULL DEFAULT 0,
  historical_scan_started_at TIMESTAMPTZ,
  historical_scan_completed_at TIMESTAMPTZ,
  historical_scan_last_run_at TIMESTAMPTZ,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_google_mailbox_per_chef UNIQUE (chef_id, normalized_email),
  CONSTRAINT google_mailbox_status_check CHECK (
    historical_scan_status IN ('idle', 'in_progress', 'completed', 'paused')
  )
);

CREATE INDEX IF NOT EXISTS idx_google_mailboxes_chef
  ON google_mailboxes (chef_id, is_active, is_primary DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_google_mailboxes_gmail_active
  ON google_mailboxes (gmail_connected, is_active)
  WHERE gmail_connected = true AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_google_mailboxes_scan_active
  ON google_mailboxes (historical_scan_enabled, gmail_connected, is_active)
  WHERE historical_scan_enabled = true AND gmail_connected = true AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_google_mailboxes_primary_one
  ON google_mailboxes (chef_id)
  WHERE is_primary = true AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_google_mailboxes_active_email
  ON google_mailboxes (normalized_email)
  WHERE gmail_connected = true AND is_active = true;

ALTER TABLE google_mailboxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs manage own google mailboxes"
  ON google_mailboxes
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

CREATE POLICY "Service role manages google mailboxes"
  ON google_mailboxes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_google_mailboxes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.normalized_email = lower(trim(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_google_mailboxes_updated_at ON google_mailboxes;
CREATE TRIGGER trg_google_mailboxes_updated_at
  BEFORE UPDATE ON google_mailboxes
  FOR EACH ROW
  EXECUTE FUNCTION update_google_mailboxes_updated_at();

DROP TRIGGER IF EXISTS trg_google_mailboxes_normalize_insert ON google_mailboxes;
CREATE TRIGGER trg_google_mailboxes_normalize_insert
  BEFORE INSERT ON google_mailboxes
  FOR EACH ROW
  EXECUTE FUNCTION update_google_mailboxes_updated_at();

INSERT INTO google_mailboxes (
  chef_id,
  tenant_id,
  email,
  normalized_email,
  access_token,
  refresh_token,
  token_expires_at,
  scopes,
  gmail_connected,
  gmail_history_id,
  gmail_last_sync_at,
  gmail_sync_errors,
  historical_scan_enabled,
  historical_scan_include_spam_trash,
  historical_scan_status,
  historical_scan_page_token,
  historical_scan_total_processed,
  historical_scan_total_seen,
  historical_scan_result_size_estimate,
  historical_scan_lookback_days,
  historical_scan_started_at,
  historical_scan_completed_at,
  historical_scan_last_run_at,
  is_primary,
  is_active,
  created_at,
  updated_at
)
SELECT
  gc.chef_id,
  gc.tenant_id,
  gc.connected_email,
  lower(trim(gc.connected_email)),
  gc.access_token,
  gc.refresh_token,
  gc.token_expires_at,
  gc.scopes,
  gc.gmail_connected,
  gc.gmail_history_id,
  gc.gmail_last_sync_at,
  gc.gmail_sync_errors,
  gc.historical_scan_enabled,
  gc.historical_scan_include_spam_trash,
  gc.historical_scan_status,
  gc.historical_scan_page_token,
  gc.historical_scan_total_processed,
  gc.historical_scan_total_seen,
  gc.historical_scan_result_size_estimate,
  gc.historical_scan_lookback_days,
  gc.historical_scan_started_at,
  gc.historical_scan_completed_at,
  gc.historical_scan_last_run_at,
  true,
  coalesce(gc.gmail_connected, false),
  gc.created_at,
  gc.updated_at
FROM google_connections gc
WHERE gc.connected_email IS NOT NULL
ON CONFLICT (chef_id, normalized_email) DO UPDATE
SET
  access_token = EXCLUDED.access_token,
  refresh_token = COALESCE(EXCLUDED.refresh_token, google_mailboxes.refresh_token),
  token_expires_at = EXCLUDED.token_expires_at,
  scopes = EXCLUDED.scopes,
  gmail_connected = EXCLUDED.gmail_connected,
  gmail_history_id = EXCLUDED.gmail_history_id,
  gmail_last_sync_at = EXCLUDED.gmail_last_sync_at,
  gmail_sync_errors = EXCLUDED.gmail_sync_errors,
  historical_scan_enabled = EXCLUDED.historical_scan_enabled,
  historical_scan_include_spam_trash = EXCLUDED.historical_scan_include_spam_trash,
  historical_scan_status = EXCLUDED.historical_scan_status,
  historical_scan_page_token = EXCLUDED.historical_scan_page_token,
  historical_scan_total_processed = EXCLUDED.historical_scan_total_processed,
  historical_scan_total_seen = EXCLUDED.historical_scan_total_seen,
  historical_scan_result_size_estimate = EXCLUDED.historical_scan_result_size_estimate,
  historical_scan_lookback_days = EXCLUDED.historical_scan_lookback_days,
  historical_scan_started_at = EXCLUDED.historical_scan_started_at,
  historical_scan_completed_at = EXCLUDED.historical_scan_completed_at,
  historical_scan_last_run_at = EXCLUDED.historical_scan_last_run_at,
  is_primary = true,
  is_active = EXCLUDED.is_active,
  updated_at = now();

ALTER TABLE gmail_sync_log
  ADD COLUMN IF NOT EXISTS mailbox_id UUID REFERENCES google_mailboxes(id) ON DELETE SET NULL;

ALTER TABLE gmail_historical_findings
  ADD COLUMN IF NOT EXISTS mailbox_id UUID REFERENCES google_mailboxes(id) ON DELETE SET NULL;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS mailbox_id UUID REFERENCES google_mailboxes(id) ON DELETE SET NULL;

UPDATE gmail_sync_log gsl
SET mailbox_id = gm.id
FROM google_mailboxes gm
WHERE gsl.mailbox_id IS NULL
  AND gm.tenant_id = gsl.tenant_id
  AND gm.is_primary = true;

UPDATE gmail_historical_findings ghf
SET mailbox_id = gm.id
FROM google_mailboxes gm
WHERE ghf.mailbox_id IS NULL
  AND gm.tenant_id = ghf.tenant_id
  AND gm.is_primary = true;

UPDATE messages m
SET mailbox_id = gm.id
FROM google_mailboxes gm
WHERE m.mailbox_id IS NULL
  AND m.gmail_message_id IS NOT NULL
  AND gm.tenant_id = m.tenant_id
  AND gm.is_primary = true;

ALTER TABLE gmail_sync_log DROP CONSTRAINT IF EXISTS unique_gmail_sync;
ALTER TABLE gmail_historical_findings DROP CONSTRAINT IF EXISTS unique_historical_finding;
DROP INDEX IF EXISTS idx_messages_gmail_dedup;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gmail_sync_log_mailbox_dedup
  ON gmail_sync_log (mailbox_id, gmail_message_id)
  WHERE mailbox_id IS NOT NULL AND gmail_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gmail_historical_findings_mailbox_dedup
  ON gmail_historical_findings (mailbox_id, gmail_message_id)
  WHERE mailbox_id IS NOT NULL AND gmail_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_gmail_mailbox_dedup
  ON messages (mailbox_id, gmail_message_id)
  WHERE mailbox_id IS NOT NULL AND gmail_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gmail_sync_log_mailbox_received
  ON gmail_sync_log (mailbox_id, received_at DESC)
  WHERE mailbox_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gmail_historical_findings_mailbox_received
  ON gmail_historical_findings (mailbox_id, received_at DESC)
  WHERE mailbox_id IS NOT NULL;
