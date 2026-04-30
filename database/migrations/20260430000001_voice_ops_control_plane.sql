-- Voice Ops Control Plane
-- Additive schema for campaign reservation, consent, session audit events, and post-call action tracking.

CREATE TABLE IF NOT EXISTS voice_call_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  launch_mode TEXT NOT NULL DEFAULT 'safe_serialized'
    CHECK (launch_mode IN ('safe_serialized', 'parallel_limited')),
  max_concurrent_calls INTEGER NOT NULL DEFAULT 1
    CHECK (max_concurrent_calls >= 1 AND max_concurrent_calls <= 5),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'reserved', 'launching', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  requested_count INTEGER NOT NULL DEFAULT 0,
  reserved_count INTEGER NOT NULL DEFAULT 0,
  launched_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  launched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_call_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES voice_call_campaigns(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ai_call_id UUID REFERENCES ai_calls(id) ON DELETE SET NULL,
  supplier_call_id UUID REFERENCES supplier_calls(id) ON DELETE SET NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  contact_type TEXT NOT NULL DEFAULT 'vendor'
    CHECK (contact_type IN ('vendor', 'venue', 'business', 'client', 'unknown')),
  role TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'queued', 'ringing', 'in_progress', 'completed', 'failed', 'skipped', 'manual_review')),
  skip_reason TEXT,
  professional_risk TEXT NOT NULL DEFAULT 'low'
    CHECK (professional_risk IN ('low', 'medium', 'high')),
  consent_state TEXT NOT NULL DEFAULT 'unknown'
    CHECK (consent_state IN ('allowed', 'unknown', 'manual_only', 'opted_out')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_call_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  contact_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (contact_type IN ('vendor', 'venue', 'business', 'client', 'unknown')),
  consent_state TEXT NOT NULL DEFAULT 'unknown'
    CHECK (consent_state IN ('allowed', 'unknown', 'manual_only', 'opted_out')),
  consent_source TEXT,
  last_ai_call_id UUID REFERENCES ai_calls(id) ON DELETE SET NULL,
  last_opt_out_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, contact_phone)
);

CREATE TABLE IF NOT EXISTS voice_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ai_call_id UUID REFERENCES ai_calls(id) ON DELETE CASCADE,
  supplier_call_id UUID REFERENCES supplier_calls(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES voice_call_campaigns(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 1,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_post_call_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ai_call_id UUID REFERENCES ai_calls(id) ON DELETE CASCADE,
  supplier_call_id UUID REFERENCES supplier_calls(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'completed', 'skipped', 'failed', 'needs_review')),
  urgency TEXT NOT NULL DEFAULT 'standard'
    CHECK (urgency IN ('standard', 'review', 'urgent')),
  label TEXT NOT NULL,
  detail TEXT,
  target_type TEXT,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS voice_call_campaigns_chef_status_idx
  ON voice_call_campaigns(chef_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS voice_campaign_recipients_campaign_idx
  ON voice_call_campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS voice_campaign_recipients_phone_idx
  ON voice_call_campaign_recipients(chef_id, contact_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS voice_call_consent_phone_idx
  ON voice_call_consent(chef_id, contact_phone);
CREATE INDEX IF NOT EXISTS voice_session_events_call_idx
  ON voice_session_events(chef_id, ai_call_id, sequence);
CREATE INDEX IF NOT EXISTS voice_session_events_supplier_call_idx
  ON voice_session_events(chef_id, supplier_call_id, sequence);
CREATE INDEX IF NOT EXISTS voice_post_call_actions_call_idx
  ON voice_post_call_actions(chef_id, ai_call_id, status);
CREATE INDEX IF NOT EXISTS voice_post_call_actions_supplier_call_idx
  ON voice_post_call_actions(chef_id, supplier_call_id, status);

COMMENT ON TABLE voice_call_campaigns IS 'Chef-scoped voice campaign reservations and launch telemetry.';
COMMENT ON TABLE voice_call_campaign_recipients IS 'Per-contact campaign reservation state for controlled multi-recipient calling.';
COMMENT ON TABLE voice_call_consent IS 'Per-phone AI calling preference and opt-out registry.';
COMMENT ON TABLE voice_session_events IS 'Append-only voice session event ledger for audit, recording, transcript, and follow-up proof.';
COMMENT ON TABLE voice_post_call_actions IS 'Planned and completed follow-up actions derived from each voice session.';
