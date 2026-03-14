-- ============================================================
-- Migration: Atomic quote response workflow (split for deploy reliability)
-- ============================================================

CREATE OR REPLACE FUNCTION respond_to_quote_atomic(
  p_quote_id UUID,
  p_client_id UUID,
  p_new_status TEXT,
  p_actor_id UUID,
  p_rejected_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote quotes%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
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

    IF auth.uid() IS DISTINCT FROM p_actor_id THEN
      RAISE EXCEPTION 'Actor mismatch';
    END IF;
  END IF;

  IF p_new_status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Unsupported quote response status: %', p_new_status;
  END IF;

  SELECT *
  INTO v_quote
  FROM quotes
  WHERE id = p_quote_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  IF v_quote.client_id IS DISTINCT FROM p_client_id THEN
    RAISE EXCEPTION 'Quote does not belong to this client';
  END IF;

  IF v_quote.status <> 'sent' THEN
    RAISE EXCEPTION 'Quote is no longer pending review';
  END IF;

  IF p_new_status = 'accepted' THEN
    UPDATE quotes
    SET
      status = 'accepted',
      rejected_at = NULL,
      rejected_reason = NULL,
      updated_by = p_actor_id,
      updated_at = v_now
    WHERE id = v_quote.id;

    IF v_quote.inquiry_id IS NOT NULL THEN
      UPDATE inquiries
      SET status = 'confirmed'
      WHERE id = v_quote.inquiry_id
        AND status = 'quoted';
    END IF;

    IF v_quote.event_id IS NOT NULL THEN
      UPDATE events
      SET
        quoted_price_cents = v_quote.total_quoted_cents,
        deposit_amount_cents = v_quote.deposit_amount_cents,
        pricing_model = v_quote.pricing_model,
        updated_by = p_actor_id,
        updated_at = v_now
      WHERE id = v_quote.event_id
        AND tenant_id = v_quote.tenant_id;
    END IF;
  ELSE
    UPDATE quotes
    SET
      status = 'rejected',
      rejected_at = v_now,
      rejected_reason = NULLIF(BTRIM(COALESCE(p_rejected_reason, '')), ''),
      updated_by = p_actor_id,
      updated_at = v_now
    WHERE id = v_quote.id;
  END IF;

  RETURN jsonb_build_object(
    'quote_id', v_quote.id,
    'tenant_id', v_quote.tenant_id,
    'client_id', v_quote.client_id,
    'event_id', v_quote.event_id,
    'inquiry_id', v_quote.inquiry_id,
    'quote_name', v_quote.quote_name,
    'total_quoted_cents', v_quote.total_quoted_cents,
    'deposit_required', v_quote.deposit_required,
    'deposit_amount_cents', v_quote.deposit_amount_cents,
    'status', p_new_status
  );
END;
$$;



