-- Side Effect Failures Table
-- Captures non-blocking operation failures that would otherwise only go to console.error.
-- Read by /admin/silent-failures dashboard. Auto-pruned after 30 days by cleanup cron.
--
-- This is additive only: one new table, one index, one RLS policy.

CREATE TABLE IF NOT EXISTS side_effect_failures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  source text NOT NULL,            -- e.g. 'lifecycle-cron', 'quote-transition', 'twilio-webhook'
  operation text NOT NULL,         -- e.g. 'send_email', 'update_sent_at', 'insert_message'
  severity text NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  entity_type text,                -- e.g. 'quote', 'call', 'rsvp', 'message'
  entity_id text,                  -- the ID of the affected record
  tenant_id uuid,                  -- which chef's data was affected (nullable for system-level failures)
  error_message text,
  context jsonb DEFAULT '{}',      -- arbitrary metadata (from phone, twilio_sid, etc.)
  dismissed_at timestamptz,        -- admin can dismiss after reviewing
  dismissed_by text                -- email of admin who dismissed
);

-- Index for admin dashboard queries (recent, undismissed first)
CREATE INDEX idx_side_effect_failures_recent
  ON side_effect_failures (created_at DESC)
  WHERE dismissed_at IS NULL;

-- Index for per-tenant lookups
CREATE INDEX idx_side_effect_failures_tenant
  ON side_effect_failures (tenant_id, created_at DESC)
  WHERE tenant_id IS NOT NULL;

-- RLS: only service role can write, admin can read via service role client
ALTER TABLE side_effect_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON side_effect_failures
  FOR ALL
  USING (true)
  WITH CHECK (true);
