-- Idempotent Gmail mailbox control-plane repair.
-- Reconciles legacy google_connections rows into google_mailboxes and backfills
-- mailbox_id on legacy compatibility surfaces without adding a new ownership model.

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
  is_active
)
SELECT
  gc.chef_id,
  gc.tenant_id,
  trim(gc.connected_email),
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
  NOT EXISTS (
    SELECT 1
    FROM google_mailboxes existing
    WHERE existing.chef_id = gc.chef_id
      AND existing.is_primary = true
      AND existing.is_active = true
  ),
  COALESCE(gc.gmail_connected, false)
FROM google_connections gc
WHERE gc.connected_email IS NOT NULL
  AND trim(gc.connected_email) <> ''
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
  is_primary = google_mailboxes.is_primary OR EXCLUDED.is_primary,
  is_active = google_mailboxes.is_active OR EXCLUDED.is_active,
  updated_at = now();

UPDATE gmail_sync_log gsl
SET mailbox_id = gm.id
FROM google_mailboxes gm
WHERE gsl.mailbox_id IS NULL
  AND gm.tenant_id = gsl.tenant_id
  AND (
    lower(trim(COALESCE(gsl.to_address, ''))) = gm.normalized_email
    OR (
      COALESCE(gsl.to_address, '') = ''
      AND gm.is_primary = true
    )
  );

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
  AND (
    lower(trim(COALESCE(m.recipient_email, ''))) = gm.normalized_email
    OR (
      COALESCE(m.recipient_email, '') = ''
      AND gm.is_primary = true
    )
  );
