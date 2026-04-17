-- ============================================================
-- Migration: Add CAS guard to transition_event_atomic
-- Fixes Q14 from operational resilience interrogation
-- Date: 2026-04-15
-- ============================================================
--
-- The previous version only checked WHERE id = p_event_id AND tenant_id = p_tenant_id.
-- Two concurrent transitions could both succeed because neither checked the current status.
-- This version adds AND status = p_from_status (Compare-And-Swap) so the UPDATE only
-- affects the row if the status hasn't changed since the caller read it.
-- If a concurrent request already changed the status, NOT FOUND fires and the
-- function raises an exception instead of silently overwriting.
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
    status     = p_to_status,
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
  WHERE id = p_event_id
    AND tenant_id = p_tenant_id
    AND status = p_from_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found, tenant mismatch, or status already changed (CAS failed): % (expected status: %)', p_event_id, p_from_status;
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
    p_from_status,
    p_to_status,
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
$func$;
