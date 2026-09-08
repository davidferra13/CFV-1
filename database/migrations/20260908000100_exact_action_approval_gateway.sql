-- P0: exact-action approvals for every consequential external mutation.
-- Approval is payload-bound, expires quickly, and is consumed atomically once.

CREATE TABLE IF NOT EXISTS exact_action_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preview_id UUID NOT NULL UNIQUE,
  action_hash TEXT NOT NULL CHECK (length(action_hash) = 64),
  action_payload JSONB NOT NULL,
  preview_payload JSONB NOT NULL,
  category TEXT NOT NULL,
  operation TEXT NOT NULL,
  provider TEXT NOT NULL,
  environment TEXT NOT NULL,
  context_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'approved', 'consumed', 'rejected', 'expired',
      'cancelled', 'incident_locked'
    )),
  preview_expires_at TIMESTAMPTZ NOT NULL,
  approval_expires_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  incident_locked_at TIMESTAMPTZ,
  incident_reason TEXT,
  execution_state TEXT NOT NULL DEFAULT 'not_started'
    CHECK (execution_state IN ('not_started', 'started', 'confirmed', 'unknown')),
  provider_receipt JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exact_action_approval_pending
  ON exact_action_approvals(tenant_id, actor_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exact_action_approval_hash
  ON exact_action_approvals(tenant_id, action_hash, status);

CREATE TABLE IF NOT EXISTS exact_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  approval_id UUID NOT NULL REFERENCES exact_action_approvals(id) ON DELETE RESTRICT,
  action_id TEXT NOT NULL,
  action_hash TEXT NOT NULL CHECK (length(action_hash) = 64),
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exact_action_audit_tenant_created
  ON exact_action_audit(tenant_id, created_at DESC);

ALTER TABLE exact_action_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE exact_action_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exact_action_approvals_tenant_select ON exact_action_approvals;
CREATE POLICY exact_action_approvals_tenant_select ON exact_action_approvals
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND actor_id = auth.uid()
  );

DROP POLICY IF EXISTS exact_action_approvals_tenant_insert ON exact_action_approvals;
CREATE POLICY exact_action_approvals_tenant_insert ON exact_action_approvals
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND actor_id = auth.uid()
    AND status = 'pending'
  );

DROP POLICY IF EXISTS exact_action_approvals_tenant_update ON exact_action_approvals;
CREATE POLICY exact_action_approvals_tenant_update ON exact_action_approvals
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND actor_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND actor_id = auth.uid()
  );

DROP POLICY IF EXISTS exact_action_audit_tenant_select ON exact_action_audit;
CREATE POLICY exact_action_audit_tenant_select ON exact_action_audit
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS exact_action_audit_tenant_insert ON exact_action_audit;
CREATE POLICY exact_action_audit_tenant_insert ON exact_action_audit
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE OR REPLACE FUNCTION consume_exact_action_approval(
  p_approval_id UUID,
  p_tenant_id UUID,
  p_actor_id UUID,
  p_action_hash TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consumed_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_actor_id THEN
    RAISE EXCEPTION 'approval_actor_scope_mismatch';
  END IF;

  IF get_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'approval_tenant_scope_mismatch';
  END IF;

  UPDATE exact_action_approvals
  SET
    status = 'expired',
    updated_at = now()
  WHERE id = p_approval_id
    AND tenant_id = p_tenant_id
    AND actor_id = p_actor_id
    AND status = 'approved'
    AND approval_expires_at <= now();

  UPDATE exact_action_approvals
  SET
    status = 'consumed',
    consumed_at = now(),
    execution_state = 'started',
    updated_at = now()
  WHERE id = p_approval_id
    AND tenant_id = p_tenant_id
    AND actor_id = p_actor_id
    AND action_hash = p_action_hash
    AND status = 'approved'
    AND preview_expires_at > now()
    AND approval_expires_at > now()
    AND consumed_at IS NULL
  RETURNING id INTO v_consumed_id;

  RETURN v_consumed_id;
END;
$$;

REVOKE ALL ON FUNCTION consume_exact_action_approval(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_exact_action_approval(UUID, UUID, UUID, TEXT)
  TO authenticated;

COMMENT ON TABLE exact_action_approvals IS
  'Single-use, exact-payload authorization records for consequential external actions.';
COMMENT ON TABLE exact_action_audit IS
  'Append-only evidence for exact-action approval and provider execution outcomes.';
