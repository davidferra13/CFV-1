-- ============================================================
-- Migration: Atomic respond menu approval
-- ============================================================

CREATE OR REPLACE FUNCTION respond_menu_approval_atomic(
  p_request_id UUID,
  p_client_id UUID,
  p_new_status TEXT,
  p_revision_notes TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request menu_approval_requests%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_notes TEXT := NULLIF(BTRIM(COALESCE(p_revision_notes, '')), '');
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.role() <> 'service_role' THEN
    IF get_current_user_role() <> 'client' THEN
      RAISE EXCEPTION 'Client role required';
    END IF;

    IF get_current_client_id() IS DISTINCT FROM p_client_id THEN
      RAISE EXCEPTION 'Client mismatch';
    END IF;

    IF p_actor_id IS NOT NULL AND auth.uid() IS DISTINCT FROM p_actor_id THEN
      RAISE EXCEPTION 'Actor mismatch';
    END IF;
  END IF;

  IF p_new_status NOT IN ('approved', 'revision_requested') THEN
    RAISE EXCEPTION 'Unsupported menu approval response status: %', p_new_status;
  END IF;

  SELECT *
  INTO v_request
  FROM menu_approval_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found';
  END IF;

  IF v_request.client_id IS DISTINCT FROM p_client_id THEN
    RAISE EXCEPTION 'Approval request does not belong to this client';
  END IF;

  IF v_request.status <> 'sent' THEN
    RAISE EXCEPTION 'This request is no longer pending';
  END IF;

  UPDATE menu_approval_requests
  SET
    status = p_new_status::menu_approval_status,
    responded_at = v_now,
    revision_notes = CASE
      WHEN p_new_status = 'revision_requested' THEN COALESCE(v_notes, '(No notes provided)')
      ELSE NULL
    END
  WHERE id = v_request.id;

  IF p_new_status = 'approved' THEN
    UPDATE events
    SET
      menu_approval_status = 'approved',
      menu_approved_at = v_now,
      menu_revision_notes = NULL,
      updated_by = COALESCE(p_actor_id, updated_by),
      updated_at = v_now
    WHERE id = v_request.event_id;
  ELSE
    UPDATE events
    SET
      menu_approval_status = 'revision_requested',
      menu_revision_notes = COALESCE(v_notes, '(No notes provided)'),
      updated_by = COALESCE(p_actor_id, updated_by),
      updated_at = v_now
    WHERE id = v_request.event_id;
  END IF;

  RETURN jsonb_build_object(
    'request_id', v_request.id,
    'event_id', v_request.event_id,
    'chef_id', v_request.chef_id,
    'client_id', v_request.client_id,
    'status', p_new_status
  );
END;
$$;;
