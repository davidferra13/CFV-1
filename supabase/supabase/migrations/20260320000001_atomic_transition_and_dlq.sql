-- ============================================================
-- Migration: Atomic event transition RPC
-- Items: #14 (DB transactions)
-- Date: 2026-02-20
-- ============================================================
--
-- Wraps event status UPDATE + event_state_transitions INSERT
-- in a single database transaction.
-- Called from lib/events/transitions.ts via supabase.rpc()
--
-- NOTE: Tables (dead_letter_queue, job_retry_log) are in
-- 20260320000003_dlq_tables.sql to work around CLI parser limits
-- on multi-statement files with plpgsql function bodies.
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
    p_from_status,
    p_to_status,
    p_transitioned_by,
    p_metadata || jsonb_build_object(
      'timestamp',   NOW(),
      'rpc_version', '1'
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
