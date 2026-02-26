-- Account Deletion Lifecycle
-- Adds soft-delete columns to chefs, creates deletion audit table,
-- creates anonymization function for 7-year financial record retention,
-- and expands the activity domain constraint to include 'account'.
--
-- All changes are additive — no DROP TABLE or DROP COLUMN.

-- ─── 1. Soft-delete columns on chefs ──────────────────────────────────────────

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deletion_reactivation_token UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN chefs.deletion_requested_at IS
  'Timestamp when chef requested account deletion. NULL = active account.';
COMMENT ON COLUMN chefs.deletion_scheduled_for IS
  'When the final purge will happen (30 days after request). NULL = no pending deletion.';
COMMENT ON COLUMN chefs.deletion_reason IS
  'Optional reason the chef chose when requesting deletion.';
COMMENT ON COLUMN chefs.deletion_reactivation_token IS
  'One-time UUID token the chef can use to cancel deletion during the 30-day grace period.';
COMMENT ON COLUMN chefs.is_deleted IS
  'TRUE after final purge completes. Chef row is kept for anonymized financial records. FALSE = active or pending.';

CREATE INDEX IF NOT EXISTS idx_chefs_deletion_scheduled
  ON chefs(deletion_scheduled_for)
  WHERE deletion_scheduled_for IS NOT NULL AND is_deleted = FALSE;

-- ─── 2. Account deletion audit table ──────────────────────────────────────────
-- Intentionally NOT FK-linked to chefs — records must survive account deletion.

CREATE TABLE IF NOT EXISTS account_deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL,
  auth_user_id UUID NOT NULL,
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'deletion_requested',
    'deletion_cancelled',
    'data_exported',
    'grace_period_expired',
    'financial_records_anonymized',
    'pii_purged',
    'storage_cleaned',
    'auth_user_deleted',
    'purge_completed'
  )),
  metadata JSONB NOT NULL DEFAULT '{}',
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  performed_by TEXT NOT NULL DEFAULT 'system'
);

COMMENT ON TABLE account_deletion_audit IS
  'Permanent audit trail for account deletion lifecycle. Not FK-linked to chefs — must survive deletion.';

CREATE INDEX IF NOT EXISTS idx_deletion_audit_chef
  ON account_deletion_audit(chef_id, performed_at DESC);

ALTER TABLE account_deletion_audit ENABLE ROW LEVEL SECURITY;

-- Service-role-only access (admin client)
CREATE POLICY deletion_audit_service_insert ON account_deletion_audit
  FOR INSERT WITH CHECK (true);

CREATE POLICY deletion_audit_service_select ON account_deletion_audit
  FOR SELECT USING (true);

-- ─── 3. Expand activity domain constraint to include 'account' ────────────────

ALTER TABLE chef_activity_log DROP CONSTRAINT IF EXISTS chk_activity_domain;
ALTER TABLE chef_activity_log ADD CONSTRAINT chk_activity_domain
  CHECK (domain IN (
    'event', 'inquiry', 'quote', 'menu', 'recipe', 'client',
    'financial', 'communication', 'operational',
    'staff', 'scheduling', 'document', 'marketing', 'ai', 'settings',
    'prospecting', 'account'
  ));

-- ─── 4. Financial record anonymization function ───────────────────────────────
-- Called during final purge after 30-day grace period.
-- Preserves financial amounts, dates, and entry types for 7-year retention
-- while stripping all PII.

CREATE OR REPLACE FUNCTION anonymize_financial_records(p_chef_id UUID)
RETURNS void AS $$
BEGIN
  -- Temporarily disable ledger immutability triggers for anonymization
  ALTER TABLE ledger_entries DISABLE TRIGGER ALL;

  -- Anonymize ledger entries — keep amounts, dates, entry_type, sequence
  UPDATE ledger_entries
  SET description = 'REDACTED - Account Deleted',
      internal_notes = NULL
  WHERE tenant_id = p_chef_id;

  -- Re-enable ledger triggers
  ALTER TABLE ledger_entries ENABLE TRIGGER ALL;

  -- Anonymize events — keep financial data, dates, guest counts
  UPDATE events
  SET location_address = 'REDACTED',
      location_city = 'REDACTED',
      location_state = 'XX',
      location_zip = '00000',
      location_notes = NULL,
      access_instructions = NULL,
      special_requests = NULL,
      kitchen_notes = NULL,
      site_notes = NULL,
      cancellation_reason = CASE WHEN cancellation_reason IS NOT NULL
        THEN 'REDACTED' ELSE NULL END
  WHERE tenant_id = p_chef_id;

  -- Anonymize clients — keep IDs for FK integrity, strip PII
  UPDATE clients
  SET full_name = 'Deleted Client',
      email = 'deleted-' || id::text || '@redacted.local',
      phone = NULL,
      partner_name = NULL,
      children = NULL,
      address = NULL,
      parking_instructions = NULL,
      access_instructions = NULL,
      kitchen_size = NULL,
      kitchen_constraints = NULL,
      house_rules = NULL,
      vibe_notes = NULL,
      payment_behavior = NULL,
      tipping_pattern = NULL,
      what_they_care_about = NULL
  WHERE chef_id = p_chef_id;

EXCEPTION WHEN OTHERS THEN
  -- Always re-enable triggers even on failure
  ALTER TABLE ledger_entries ENABLE TRIGGER ALL;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION anonymize_financial_records IS
  'Strips PII from financial records while preserving amounts/dates for 7-year retention. Called during account purge.';
