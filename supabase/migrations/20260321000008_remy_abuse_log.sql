-- Remy Abuse Log & Auto-Block System
-- Tracks policy violations, flags admin, auto-blocks repeat offenders.

-- ─── Abuse log table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS remy_abuse_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id),
  auth_user_id uuid NOT NULL,
  severity text NOT NULL CHECK (severity IN ('warning', 'critical', 'blocked')),
  category text NOT NULL,
  blocked_message text NOT NULL,
  guardrail_matched text,
  user_blocked boolean NOT NULL DEFAULT false,
  reviewed_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for admin review
CREATE INDEX IF NOT EXISTS idx_remy_abuse_log_tenant
  ON remy_abuse_log(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_remy_abuse_log_unreviewed
  ON remy_abuse_log(tenant_id) WHERE reviewed_by_admin = false;

CREATE INDEX IF NOT EXISTS idx_remy_abuse_log_user
  ON remy_abuse_log(auth_user_id, severity, created_at DESC);

-- RLS
ALTER TABLE remy_abuse_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs see own tenant abuse log"
  ON remy_abuse_log FOR SELECT
  USING (
    tenant_id = (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef'
      LIMIT 1
    )
  );

CREATE POLICY "System inserts abuse log"
  ON remy_abuse_log FOR INSERT
  WITH CHECK (true);

-- ─── Blocking column on chefs table ─────────────────────────────────────────

ALTER TABLE chefs ADD COLUMN IF NOT EXISTS remy_blocked_until timestamptz;

COMMENT ON COLUMN chefs.remy_blocked_until
  IS 'If set and > now(), user is temporarily blocked from using Remy due to repeated policy violations.';

COMMENT ON TABLE remy_abuse_log
  IS 'Audit trail for Remy guardrail violations. Admin can review flagged incidents.';
