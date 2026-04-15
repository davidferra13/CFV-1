-- ============================================================
-- Migration: Menu event_id uniqueness + template attach guard
-- Fixes: B4 (no UNIQUE on event_id), D1 (templates attachable to events)
-- ============================================================

-- Step 1: Clear orphaned event_id pointers.
-- An orphan is a menu that has event_id set but is NOT the menu
-- the event currently points to (events.menu_id). Keep the canonical one;
-- null-out the rest so the unique constraint can be added cleanly.
UPDATE menus m
SET event_id = NULL,
    updated_at = NOW()
WHERE m.event_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = m.event_id
      AND e.menu_id = m.id
  );

-- Step 2: Add UNIQUE constraint on menus.event_id.
-- PostgreSQL UNIQUE constraints allow multiple NULLs by default, so
-- template/unattached menus (event_id IS NULL) are unaffected.
ALTER TABLE menus
  ADD CONSTRAINT menus_event_id_unique UNIQUE (event_id);

-- Step 3: Replace attach_menu_to_event_atomic to:
--   a) reject template menus
--   b) clear old menu's event_id before attaching the new one
--      (prevents UNIQUE violation on re-attach)
CREATE OR REPLACE FUNCTION attach_menu_to_event_atomic(
  p_event_id  UUID,
  p_menu_id   UUID,
  p_tenant_id UUID,
  p_actor_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_count INTEGER;
  v_is_template  BOOLEAN;
BEGIN
  -- Auth guards (unchanged)
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

  -- Lock the event row
  PERFORM 1
  FROM events
  WHERE id = p_event_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Lock the menu row and read is_template
  SELECT is_template INTO v_is_template
  FROM menus
  WHERE id = p_menu_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Menu not found';
  END IF;

  -- D1: Block template menus from being attached directly
  IF v_is_template THEN
    RAISE EXCEPTION 'Template menus cannot be attached to events directly. Duplicate the template first.';
  END IF;

  -- Clear any previous menu that was attached to this event (prevents UNIQUE violation)
  UPDATE menus
  SET event_id   = NULL,
      updated_at = NOW()
  WHERE event_id    = p_event_id
    AND id         <> p_menu_id
    AND tenant_id   = p_tenant_id;

  SELECT COALESCE(get_menu_course_count(p_menu_id), 0) INTO v_course_count;

  -- Attach the new menu
  UPDATE menus
  SET event_id   = p_event_id,
      updated_by = p_actor_id,
      updated_at = NOW()
  WHERE id        = p_menu_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  UPDATE events
  SET menu_id      = p_menu_id,
      course_count = GREATEST(v_course_count, 1),
      updated_by   = p_actor_id,
      updated_at   = NOW()
  WHERE id        = p_event_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  RETURN jsonb_build_object(
    'event_id',     p_event_id,
    'menu_id',      p_menu_id,
    'course_count', GREATEST(v_course_count, 1)
  );
END;
$$;
