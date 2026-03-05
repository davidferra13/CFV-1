-- ============================================================
-- Migration: Grants for quote/menu atomic RPCs
-- ============================================================

DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION respond_to_quote_atomic(UUID, UUID, TEXT, UUID, TEXT) TO authenticated, service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION transition_quote_atomic(UUID, UUID, UUID, TEXT, TEXT, JSONB) TO authenticated, service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION send_menu_for_approval_atomic(UUID, UUID, JSONB, UUID) TO authenticated, service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION respond_menu_approval_atomic(UUID, UUID, TEXT, TEXT, UUID) TO authenticated, service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION attach_menu_to_event_atomic(UUID, UUID, UUID, UUID) TO authenticated, service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION detach_menu_from_event_atomic(UUID, UUID, UUID) TO authenticated, service_role';
END;
$$;
