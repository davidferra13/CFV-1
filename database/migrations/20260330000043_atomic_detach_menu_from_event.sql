-- ============================================================
-- Migration: Atomic detach menu from event
-- ============================================================

CREATE OR REPLACE FUNCTION detach_menu_from_event_atomic(
  p_menu_id UUID,
  p_tenant_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.role() <> 'service_role' THEN
    IF get_current_user_role() <> 'chef' THEN
      RAISE EXCEPTION 'Chef role required';
    END IF;

    IF get_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
      RAISE EXCEPTION 'Tenant mismatch';
    END IF;

    IF auth.uid() IS DISTINCT FROM p_actor_id THEN
      RAISE EXCEPTION 'Actor mismatch';
    END IF;
  END IF;

  SELECT event_id
  INTO v_event_id
  FROM menus
  WHERE id = p_menu_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Menu not found';
  END IF;

  UPDATE menus
  SET
    event_id = NULL,
    updated_by = p_actor_id,
    updated_at = NOW()
  WHERE id = p_menu_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  IF v_event_id IS NOT NULL THEN
    UPDATE events
    SET
      menu_id = NULL,
      updated_by = p_actor_id,
      updated_at = NOW()
    WHERE id = v_event_id
      AND tenant_id = p_tenant_id
      AND menu_id = p_menu_id;
  END IF;

  RETURN jsonb_build_object(
    'menu_id', p_menu_id,
    'event_id', v_event_id
  );
END;
$$;



