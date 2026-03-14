-- ============================================================
-- Migration: Grant execute on transition_event_atomic RPC
-- Date: 2026-02-20
-- Depends on: 20260320000001 (transition_event_atomic function)
-- ============================================================

GRANT EXECUTE ON FUNCTION transition_event_atomic(UUID, TEXT, TEXT, UUID, UUID, JSONB) TO authenticated, service_role;
