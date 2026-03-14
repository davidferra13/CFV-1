-- ============================================================
-- Migration: Atomic chef quote transitions
-- Purpose:
--   - Route chef-managed quote transitions through one RPC:
--     draft -> sent, sent -> expired, expired -> draft
--   - Keep status updates + audit trigger effects in one transaction.
-- ============================================================

CREATE OR REPLACE FUNCTION transition_quote_atomic(
  p_quote_id UUID,
  p_tenant_id UUID,
  p_actor_id UUID,
  p_to_status TEXT,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
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

  IF p_to_status NOT IN ('draft', 'sent', 'expired') THEN
    RAISE EXCEPTION 'Unsupported quote transition status: %', p_to_status;
  END IF;

  SELECT *
  INTO v_quote
  FROM quotes
  WHERE id = p_quote_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  IF p_to_status = 'sent' AND v_quote.status <> 'draft' THEN
    RAISE EXCEPTION 'Invalid transition from % to %', v_quote.status, p_to_status;
  END IF;

  IF p_to_status = 'expired' AND v_quote.status <> 'sent' THEN
    RAISE EXCEPTION 'Invalid transition from % to %', v_quote.status, p_to_status;
  END IF;

  IF p_to_status = 'draft' AND v_quote.status <> 'expired' THEN
    RAISE EXCEPTION 'Invalid transition from % to %', v_quote.status, p_to_status;
  END IF;

  UPDATE quotes
  SET
    status = p_to_status::quote_status,
    sent_at = CASE
      WHEN p_to_status = 'sent' THEN v_now
      ELSE sent_at
    END,
    expired_at = CASE
      WHEN p_to_status = 'expired' THEN v_now
      WHEN p_to_status = 'draft' THEN NULL
      ELSE expired_at
    END,
    updated_by = p_actor_id,
    updated_at = v_now
  WHERE id = v_quote.id
    AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'quote_id', v_quote.id,
    'status', p_to_status,
    'tenant_id', v_quote.tenant_id,
    'client_id', v_quote.client_id,
    'inquiry_id', v_quote.inquiry_id,
    'event_id', v_quote.event_id,
    'quote_name', v_quote.quote_name,
    'total_quoted_cents', v_quote.total_quoted_cents,
    'deposit_required', v_quote.deposit_required,
    'deposit_amount_cents', v_quote.deposit_amount_cents,
    'valid_until', v_quote.valid_until,
    'reason', NULLIF(BTRIM(COALESCE(p_reason, '')), ''),
    'metadata', COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;



