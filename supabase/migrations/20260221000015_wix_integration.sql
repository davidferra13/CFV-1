-- ============================================================================
-- Wix Integration — Phase 1
-- Adds 'wix' channel, wix_connections table, and wix_submissions staging table.
-- Enables real-time Wix form submission → ChefFlow inquiry pipeline.
-- Follows the same pattern as gmail_agent migration (google_connections + gmail_sync_log).
-- ============================================================================

-- ─── Add 'wix' to inquiry_channel enum ────────────────────────────────────

ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'wix';
-- ─── Wix Connections ──────────────────────────────────────────────────────
-- One row per chef — stores webhook authentication and form mapping config.

CREATE TABLE wix_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Webhook authentication
  webhook_secret TEXT NOT NULL,  -- Used to verify incoming webhook signatures

  -- Configuration
  form_field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Maps Wix form field names → inquiry fields
  auto_create_inquiry BOOLEAN NOT NULL DEFAULT true,

  -- Sync state
  last_submission_at TIMESTAMPTZ,
  total_submissions INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_chef_wix UNIQUE (chef_id)
);
-- ─── Wix Submissions ─────────────────────────────────────────────────────
-- Raw staging table: accepts webhook payloads immediately, processes async.
-- Mirrors gmail_sync_log pattern for audit + dedup.

CREATE TABLE wix_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Wix identifiers (for idempotency)
  wix_submission_id TEXT NOT NULL,
  wix_form_id TEXT,

  -- Raw payload preserved verbatim
  raw_payload JSONB NOT NULL,

  -- Extracted fields (populated during processing)
  submitter_name TEXT,
  submitter_email TEXT,
  submitter_phone TEXT,

  -- Processing state
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'duplicate')),

  -- Links to created records
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Dedup tracking (links to gmail_sync_log if same submission arrived via email)
  gmail_duplicate_of UUID REFERENCES gmail_sync_log(id) ON DELETE SET NULL,

  -- Error tracking
  error TEXT,
  processing_attempts INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,

  -- Idempotency: one submission per Wix ID per tenant
  CONSTRAINT unique_wix_submission UNIQUE (tenant_id, wix_submission_id)
);
-- ─── Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX idx_wix_submissions_tenant
  ON wix_submissions(tenant_id, created_at DESC);
CREATE INDEX idx_wix_submissions_pending
  ON wix_submissions(status) WHERE status = 'pending';
CREATE INDEX idx_wix_submissions_email
  ON wix_submissions(tenant_id, submitter_email)
  WHERE submitter_email IS NOT NULL;
CREATE INDEX idx_wix_connections_active
  ON wix_connections(chef_id);
-- ─── RLS Policies ─────────────────────────────────────────────────────────

ALTER TABLE wix_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wix_submissions ENABLE ROW LEVEL SECURITY;
-- wix_connections: chefs can read/write only their own row
CREATE POLICY "Chefs manage own wix connection"
  ON wix_connections
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
-- wix_submissions: chefs can read their own tenant submissions
CREATE POLICY "Chefs read own wix submissions"
  ON wix_submissions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- Service role can manage wix_connections (for webhook processing)
CREATE POLICY "Service role manages wix connections"
  ON wix_connections
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
-- Service role can manage wix_submissions (for webhook + cron processing)
CREATE POLICY "Service role manages wix submissions"
  ON wix_submissions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
