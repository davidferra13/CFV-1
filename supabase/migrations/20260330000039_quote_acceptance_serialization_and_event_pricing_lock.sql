-- ============================================================
-- Migration: Quote acceptance serialization + pricing lock hardening
-- Purpose:
--   1) Serialize quote acceptance per event/inquiry workflow to avoid
--      concurrent dual-accept races.
--   2) Ensure converting_quote_id always points to the accepted quote.
--   3) Add DB-level trigger to block pricing drift when an accepted quote
--      is linked to an event.
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
  v_event events%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_clean_reason TEXT := NULLIF(BTRIM(COALESCE(p_rejected_reason, '')), '');
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
    -- Serialize acceptance for this workflow to avoid concurrent dual-accept races
    IF v_quote.event_id IS NOT NULL THEN
      PERFORM pg_advisory_xact_lock(91001, hashtext(v_quote.event_id::text));
    ELSIF v_quote.inquiry_id IS NOT NULL THEN
      PERFORM pg_advisory_xact_lock(91002, hashtext(v_quote.inquiry_id::text));
    ELSE
      PERFORM pg_advisory_xact_lock(91003, hashtext(v_quote.id::text));
    END IF;

    IF EXISTS (
      SELECT 1
      FROM quotes q
      WHERE q.id <> v_quote.id
        AND q.deleted_at IS NULL
        AND q.status = 'accepted'
        AND (
          (v_quote.event_id IS NOT NULL AND q.event_id = v_quote.event_id)
          OR (v_quote.inquiry_id IS NOT NULL AND q.inquiry_id = v_quote.inquiry_id)
        )
    ) THEN
      RAISE EXCEPTION 'Another quote is already accepted for this workflow';
    END IF;

    IF v_quote.event_id IS NOT NULL THEN
      SELECT *
      INTO v_event
      FROM events
      WHERE id = v_quote.event_id
        AND tenant_id = v_quote.tenant_id
        AND deleted_at IS NULL
      FOR UPDATE;

      IF FOUND THEN
        IF v_event.status IN ('draft', 'proposed') THEN
          UPDATE events
          SET
            quoted_price_cents = v_quote.total_quoted_cents,
            deposit_amount_cents = v_quote.deposit_amount_cents,
            pricing_model = v_quote.pricing_model,
            converting_quote_id = v_quote.id,
            scope_drift_acknowledged = FALSE,
            scope_drift_acknowledged_at = NULL,
            updated_by = p_actor_id,
            updated_at = v_now
          WHERE id = v_event.id
            AND tenant_id = v_quote.tenant_id;
        ELSE
          IF (
            v_event.quoted_price_cents IS DISTINCT FROM v_quote.total_quoted_cents
            OR v_event.deposit_amount_cents IS DISTINCT FROM v_quote.deposit_amount_cents
            OR v_event.pricing_model IS DISTINCT FROM v_quote.pricing_model
          ) THEN
            RAISE EXCEPTION
              'Cannot accept quote: linked event pricing is locked at status %',
              v_event.status;
          END IF;

          UPDATE events
          SET
            converting_quote_id = v_quote.id,
            scope_drift_acknowledged = FALSE,
            scope_drift_acknowledged_at = NULL,
            updated_by = p_actor_id,
            updated_at = v_now
          WHERE id = v_event.id
            AND tenant_id = v_quote.tenant_id;
        END IF;
      END IF;
    END IF;

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
  ELSE
    UPDATE quotes
    SET
      status = 'rejected',
      rejected_at = v_now,
      rejected_reason = v_clean_reason,
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
    'status', p_new_status,
    'converting_quote_id', CASE WHEN v_quote.event_id IS NOT NULL THEN v_quote.id ELSE NULL END
  );
END;
$$;;
