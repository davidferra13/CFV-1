-- SMS Draft Responses: Remy-generated draft replies for chef approval
-- Part of SMS Auto-Triage feature (Client Communication #32)

CREATE TABLE IF NOT EXISTS sms_draft_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL,
  sender_phone TEXT NOT NULL,
  original_message TEXT NOT NULL,
  draft_response TEXT NOT NULL,
  confidence_score REAL NOT NULL DEFAULT 0.5,
  context_used JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'edited', 'rejected', 'sent', 'expired')),
  escalation_level INTEGER NOT NULL DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  edited_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_drafts_tenant_status
  ON sms_draft_responses(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_sms_drafts_thread
  ON sms_draft_responses(thread_id);

CREATE INDEX IF NOT EXISTS idx_sms_drafts_pending_created
  ON sms_draft_responses(tenant_id, created_at)
  WHERE status = 'pending';

-- Add draft_id column to sms_triage_metadata so triage row links to its draft
ALTER TABLE sms_triage_metadata
  ADD COLUMN IF NOT EXISTS draft_id UUID REFERENCES sms_draft_responses(id);

-- Add escalation config to auto_response_config
ALTER TABLE auto_response_config
  ADD COLUMN IF NOT EXISTS sms_escalation_minutes INTEGER NOT NULL DEFAULT 15;
