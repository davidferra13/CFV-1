-- ============================================================================
-- SMS Triage Metadata (Additive)
-- Thin metadata table joining to conversation_threads for SMS-specific triage
-- state. Does not duplicate thread data; adds priority, triage lifecycle,
-- draft content, and escalation tracking.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_triage_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  priority smallint NOT NULL DEFAULT 2,  -- 0=critical, 1=high, 2=normal, 3=low
  triage_state text NOT NULL DEFAULT 'pending'
    CHECK (triage_state IN ('pending', 'ack_sent', 'draft_ready', 'approved', 'resolved', 'escalated')),
  ack_sent_at timestamptz,
  draft_content text,
  draft_generated_at timestamptz,
  escalated_at timestamptz,
  escalation_reason text,
  resolved_at timestamptz,
  client_context jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(thread_id)
);

-- Indexes for triage queries
CREATE INDEX IF NOT EXISTS idx_sms_triage_tenant_state
  ON sms_triage_metadata(tenant_id, triage_state)
  WHERE triage_state NOT IN ('resolved');

CREATE INDEX IF NOT EXISTS idx_sms_triage_priority
  ON sms_triage_metadata(tenant_id, priority, created_at DESC)
  WHERE triage_state = 'pending';

-- Row-level security
ALTER TABLE sms_triage_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON sms_triage_metadata
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant_id', true))::uuid);

-- Reuse existing updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sms_triage_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
