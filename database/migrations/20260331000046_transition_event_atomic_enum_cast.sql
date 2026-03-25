-- ============================================================
-- Migration: transition_event_atomic enum cast fix
-- Date: 2026-03-31
-- ============================================================
--
-- The RPC accepts TEXT arguments from the application layer, but the
-- events.status / event_state_transitions.* columns are the event_status enum.
-- Cast explicitly inside the function body so the RPC remains callable
-- without changing its public signature.
-- ============================================================

CREATE OR REPLACE FUNCTION transition_event_atomic(
  p_event_id        UUID,
  p_to_status       TEXT,
  p_from_status     TEXT,
  p_transitioned_by UUID,
  p_tenant_id       UUID,
  p_metadata        JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE events
  SET
    status     = p_to_status::event_status,
    updated_by = p_transitioned_by,
    cancelled_at = CASE
      WHEN p_to_status = 'cancelled' THEN NOW()
      ELSE cancelled_at
    END,
    cancellation_reason = CASE
      WHEN p_to_status = 'cancelled' THEN (p_metadata->>'reason')
      ELSE cancellation_reason
    END,
    cancellation_initiated_by = CASE
      WHEN p_to_status = 'cancelled' AND p_metadata->>'source' = 'system' THEN 'mutual'
      WHEN p_to_status = 'cancelled' AND p_metadata->>'actor_role' = 'chef'   THEN 'chef'
      WHEN p_to_status = 'cancelled' AND p_metadata->>'actor_role' = 'client' THEN 'client'
      ELSE cancellation_initiated_by
    END
  WHERE id = p_event_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or tenant mismatch: %', p_event_id;
  END IF;

  INSERT INTO event_state_transitions (
    tenant_id,
    event_id,
    from_status,
    to_status,
    transitioned_by,
    metadata
  ) VALUES (
    p_tenant_id,
    p_event_id,
    p_from_status::event_status,
    p_to_status::event_status,
    p_transitioned_by,
    p_metadata || jsonb_build_object(
      'timestamp',   NOW(),
      'rpc_version', '2'
    )
  );

  v_result := jsonb_build_object(
    'success',     true,
    'from_status', p_from_status,
    'to_status',   p_to_status,
    'event_id',    p_event_id
  );

  RETURN v_result;
END;
$func$;;
