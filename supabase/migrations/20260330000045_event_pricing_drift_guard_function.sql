-- ============================================================
-- Migration: Event pricing drift guard function
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_event_pricing_drift_from_accepted_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_quote quotes%ROWTYPE;
BEGIN
  -- Trigger is scoped to pricing fields only, so no-op check not needed.

  IF NEW.converting_quote_id IS NOT NULL THEN
    SELECT *
    INTO v_quote
    FROM quotes
    WHERE id = NEW.converting_quote_id
      AND tenant_id = NEW.tenant_id
      AND deleted_at IS NULL
      AND status = 'accepted';
  END IF;

  IF NOT FOUND THEN
    SELECT *
    INTO v_quote
    FROM quotes q
    WHERE q.event_id = NEW.id
      AND q.tenant_id = NEW.tenant_id
      AND q.deleted_at IS NULL
      AND q.status = 'accepted'
    ORDER BY q.accepted_at DESC NULLS LAST, q.created_at DESC
    LIMIT 1;
  END IF;

  IF FOUND THEN
    IF (
      NEW.quoted_price_cents IS DISTINCT FROM v_quote.total_quoted_cents
      OR NEW.deposit_amount_cents IS DISTINCT FROM v_quote.deposit_amount_cents
      OR NEW.pricing_model IS DISTINCT FROM v_quote.pricing_model
    ) THEN
      RAISE EXCEPTION
        'Event pricing must match accepted quote %. Update by revising and accepting a new quote.',
        v_quote.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
