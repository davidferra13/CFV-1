-- Email Historical Scan
-- Adds opt-in historical Gmail scan capability.
-- Chefs can enable a background scan of their full Gmail history to surface
-- missed booking inquiries. Findings are staged for chef review — nothing is
-- auto-imported. Chef explicitly imports or dismisses each finding.
--
-- Changes:
--   1. Extend google_connections with scan tracking columns
--   2. New table: gmail_historical_findings (staged findings for chef review)

-- ─── 1. Extend google_connections ────────────────────────────────────────────

ALTER TABLE google_connections
  ADD COLUMN IF NOT EXISTS historical_scan_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS historical_scan_status TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS historical_scan_page_token TEXT,
  ADD COLUMN IF NOT EXISTS historical_scan_total_processed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS historical_scan_lookback_days INTEGER NOT NULL DEFAULT 730,
  ADD COLUMN IF NOT EXISTS historical_scan_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS historical_scan_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS historical_scan_last_run_at TIMESTAMPTZ;
-- ─── 2. Staged findings table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gmail_historical_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT,
  from_address TEXT NOT NULL,
  subject TEXT,
  body_preview TEXT,          -- First 500 chars of body (for review card)
  received_at TIMESTAMPTZ,    -- Date parsed from email headers
  classification TEXT NOT NULL CHECK (classification IN ('inquiry', 'existing_thread')),
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  ai_reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'imported', 'dismissed')),
  imported_inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_historical_finding UNIQUE (tenant_id, gmail_message_id)
);
-- ─── 3. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_historical_findings_chef_status
  ON gmail_historical_findings(chef_id, status);
CREATE INDEX IF NOT EXISTS idx_historical_findings_tenant
  ON gmail_historical_findings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_historical_findings_received
  ON gmail_historical_findings(tenant_id, received_at DESC);
-- ─── 4. Row-Level Security ────────────────────────────────────────────────────

ALTER TABLE gmail_historical_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "historical_findings_select_own" ON gmail_historical_findings
  FOR SELECT USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
      LIMIT 1
    )
  );
CREATE POLICY "historical_findings_update_own" ON gmail_historical_findings
  FOR UPDATE USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
      LIMIT 1
    )
  );
-- Service role has full access (for cron job processing)
CREATE POLICY "historical_findings_service_all" ON gmail_historical_findings
  FOR ALL USING (auth.role() = 'service_role');
