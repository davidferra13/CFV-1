-- ============================================================
-- Migration: Add CAS guard to transition_event_atomic RPC
-- Date: 2026-04-15
-- ============================================================
--
-- The WHERE clause previously only checked id and tenant_id.
-- Two concurrent calls could both UPDATE successfully even after
-- the first already changed the status, because status = new_value
-- still satisfies WHERE id = X AND tenant_id = Y.
--
-- Fix: add AND status = p_from_status::event_status to the UPDATE.
-- If the status has already been changed by a concurrent caller,
-- NOT FOUND is raised and the second call fails cleanly.
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
  -- CAS guard: only update if status is still the expected from_status.
  -- Prevents concurrent transitions from both succeeding on the same row.
  WHERE id = p_event_id
    AND tenant_id = p_tenant_id
    AND status = p_from_status::event_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transition rejected: event % not in expected status % (already transitioned or not found)',
      p_event_id, p_from_status;
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
      'rpc_version', '3'
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
$func$;
