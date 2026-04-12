-- Fix: partial refund sets payment_status to 'refunded' even when balance remains
-- The trigger was checking IS_ANY_REFUND? -> 'refunded', which is wrong.
-- A partial refund on a paid event should leave status as 'paid' or 'partial'
-- depending on the net balance after refunds.

CREATE OR REPLACE FUNCTION update_event_payment_status_on_ledger_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid INTEGER;
  v_total_refunded INTEGER;
  v_net_paid INTEGER;
  v_quoted INTEGER;
  v_deposit INTEGER;
  v_has_refund BOOLEAN;
  v_new_status payment_status;
BEGIN
  -- Only process if linked to an event
  IF NEW.event_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get event details
  SELECT quoted_price_cents, deposit_amount_cents
  INTO v_quoted, v_deposit
  FROM events
  WHERE id = NEW.event_id;

  -- Calculate total paid (excluding refunds)
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_total_paid
  FROM ledger_entries
  WHERE event_id = NEW.event_id AND is_refund = false;

  -- Calculate total refunded
  SELECT COALESCE(SUM(ABS(amount_cents)), 0)
  INTO v_total_refunded
  FROM ledger_entries
  WHERE event_id = NEW.event_id AND is_refund = true;

  v_has_refund := v_total_refunded > 0;
  v_net_paid := v_total_paid - v_total_refunded;

  -- Determine payment status based on net balance
  IF v_has_refund AND v_net_paid <= 0 THEN
    -- Fully refunded (net zero or negative)
    v_new_status = 'refunded';
  ELSIF v_net_paid = 0 THEN
    v_new_status = 'unpaid';
  ELSIF v_deposit IS NOT NULL AND v_net_paid >= v_deposit AND v_net_paid < v_quoted THEN
    v_new_status = 'partial';
  ELSIF v_net_paid >= v_quoted THEN
    v_new_status = 'paid';
  ELSIF v_net_paid > 0 AND v_net_paid < COALESCE(v_deposit, v_quoted) THEN
    v_new_status = 'deposit_paid';
  ELSE
    v_new_status = 'partial';
  END IF;

  -- Update event
  UPDATE events
  SET payment_status = v_new_status
  WHERE id = NEW.event_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
