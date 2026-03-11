-- ============================================================
-- Migration: Atomic send menu for approval
-- ============================================================

CREATE OR REPLACE FUNCTION send_menu_for_approval_atomic(
  p_event_id UUID,
  p_chef_id UUID,
  p_menu_snapshot JSONB,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event events%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_request_id UUID;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.role() <> 'service_role' THEN
    IF get_current_user_role() <> 'chef' THEN
      RAISE EXCEPTION 'Chef role required';
    END IF;

    IF get_current_tenant_id() IS DISTINCT FROM p_chef_id THEN
      RAISE EXCEPTION 'Chef mismatch';
    END IF;

    IF auth.uid() IS DISTINCT FROM p_actor_id THEN
      RAISE EXCEPTION 'Actor mismatch';
    END IF;
  END IF;

  SELECT *
  INTO v_event
  FROM events
  WHERE id = p_event_id
    AND tenant_id = p_chef_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.client_id IS NULL THEN
    RAISE EXCEPTION 'Event has no client';
  END IF;

  INSERT INTO menu_approval_requests (
    event_id,
    chef_id,
    client_id,
    menu_snapshot,
    sent_at,
    status
  )
  VALUES (
    v_event.id,
    p_chef_id,
    v_event.client_id,
    COALESCE(p_menu_snapshot, '[]'::jsonb),
    v_now,
    'sent'
  )
  RETURNING id INTO v_request_id;

  UPDATE events
  SET
    menu_approval_status = 'sent',
    menu_sent_at = v_now,
    updated_by = p_actor_id,
    updated_at = v_now
  WHERE id = v_event.id
    AND tenant_id = p_chef_id;

  RETURN jsonb_build_object(
    'request_id', v_request_id,
    'event_id', v_event.id,
    'chef_id', p_chef_id,
    'client_id', v_event.client_id
  );
END;
$$;;
