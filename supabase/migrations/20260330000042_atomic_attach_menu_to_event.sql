-- ============================================================
-- Migration: Atomic attach menu to event
-- ============================================================

CREATE OR REPLACE FUNCTION attach_menu_to_event_atomic(
  p_event_id UUID,
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
  v_course_count INTEGER;
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

  PERFORM 1
  FROM events
  WHERE id = p_event_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  PERFORM 1
  FROM menus
  WHERE id = p_menu_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Menu not found';
  END IF;

  SELECT COALESCE(get_menu_course_count(p_menu_id), 0) INTO v_course_count;

  UPDATE menus
  SET
    event_id = p_event_id,
    updated_by = p_actor_id,
    updated_at = NOW()
  WHERE id = p_menu_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  UPDATE events
  SET
    menu_id = p_menu_id,
    course_count = GREATEST(v_course_count, 1),
    updated_by = p_actor_id,
    updated_at = NOW()
  WHERE id = p_event_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  RETURN jsonb_build_object(
    'event_id', p_event_id,
    'menu_id', p_menu_id,
    'course_count', GREATEST(v_course_count, 1)
  );
END;
$$;



