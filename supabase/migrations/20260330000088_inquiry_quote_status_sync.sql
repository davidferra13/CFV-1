-- ============================================================
-- Migration: Inquiry transition logging + quote/inquiry sync
-- Purpose:
--   1) Align DB transition validation with the app's inquiry flow.
--   2) Allow sending a quote to advance an inquiry to "quoted" even if
--      earlier manual statuses were skipped.
--   3) Harden quote acceptance so linked inquiries still confirm cleanly.
-- ============================================================

CREATE OR REPLACE FUNCTION validate_inquiry_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow initial state (from_status is NULL)
  IF NEW.from_status IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (NEW.from_status = 'new' AND NEW.to_status IN ('awaiting_client', 'quoted', 'declined')) OR
    (NEW.from_status = 'awaiting_client' AND NEW.to_status IN ('awaiting_chef', 'quoted', 'declined', 'expired')) OR
    (NEW.from_status = 'awaiting_chef' AND NEW.to_status IN ('awaiting_client', 'quoted', 'declined')) OR
    (NEW.from_status = 'quoted' AND NEW.to_status IN ('confirmed', 'declined', 'expired')) OR
    (NEW.from_status = 'expired' AND NEW.to_status IN ('new'))
  ) THEN
    RAISE EXCEPTION 'Invalid inquiry state transition: % -> %. This transition is not allowed.', NEW.from_status, NEW.to_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  v_inquiry inquiries%ROWTYPE;
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
      SELECT *
      INTO v_inquiry
      FROM inquiries
      WHERE id = v_quote.inquiry_id
        AND tenant_id = v_quote.tenant_id
      FOR UPDATE;

      IF FOUND THEN
        IF v_inquiry.status IN ('new', 'awaiting_client', 'awaiting_chef') THEN
          UPDATE inquiries
          SET
            status = 'quoted',
            updated_at = v_now
          WHERE id = v_inquiry.id;

          INSERT INTO inquiry_state_transitions (
            tenant_id,
            inquiry_id,
            from_status,
            to_status,
            transitioned_by,
            reason,
            metadata
          ) VALUES (
            v_quote.tenant_id,
            v_inquiry.id,
            v_inquiry.status,
            'quoted',
            p_actor_id,
            'quote_sent_sync',
            jsonb_build_object(
              'source', 'quote_client_acceptance',
              'quote_id', v_quote.id
            )
          );

          v_inquiry.status := 'quoted';
        END IF;

        IF v_inquiry.status = 'quoted' THEN
          UPDATE inquiries
          SET
            status = 'confirmed',
            updated_at = v_now
          WHERE id = v_inquiry.id;

          INSERT INTO inquiry_state_transitions (
            tenant_id,
            inquiry_id,
            from_status,
            to_status,
            transitioned_by,
            reason,
            metadata
          ) VALUES (
            v_quote.tenant_id,
            v_inquiry.id,
            'quoted',
            'confirmed',
            p_actor_id,
            'quote_accepted',
            jsonb_build_object(
              'source', 'quote_client_acceptance',
              'quote_id', v_quote.id
            )
          );
        END IF;
      END IF;
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
$$;
