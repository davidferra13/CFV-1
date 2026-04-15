-- Fix event_financial_summary view: exclude soft-deleted events (Q65)
-- Add cancelled_at to payment_plan_installments + trigger to void on event cancel (Q66)

-- 1. Rebuild event_financial_summary to exclude soft-deleted events.
--    Without this filter, soft-deleted events appear in financial reports,
--    overstating revenue and expenses.
CREATE OR REPLACE VIEW event_financial_summary AS
SELECT
  e.id AS event_id,
  e.tenant_id,
  e.quoted_price_cents,
  e.payment_status,
  COALESCE(
    SUM(le.amount_cents) FILTER (WHERE le.is_refund = false AND le.entry_type != 'tip'),
    0
  ) AS total_paid_cents,
  COALESCE(
    SUM(ABS(le.amount_cents)) FILTER (WHERE le.is_refund = true),
    0
  ) AS total_refunded_cents,
  COALESCE(SUM(le.amount_cents), 0) AS net_revenue_cents,
  COALESCE(SUM(ex.amount_cents), 0) AS total_expenses_cents,
  e.tip_amount_cents,
  (COALESCE(SUM(le.amount_cents), 0) - COALESCE(SUM(ex.amount_cents), 0)) AS profit_cents,
  CASE
    WHEN COALESCE(SUM(le.amount_cents), 0) > 0
      THEN (COALESCE(SUM(le.amount_cents), 0) - COALESCE(SUM(ex.amount_cents), 0))::numeric
        / COALESCE(SUM(le.amount_cents), 1)::numeric
    ELSE 0::numeric
  END AS profit_margin,
  CASE
    WHEN COALESCE(SUM(le.amount_cents), 0) > 0
      THEN COALESCE(SUM(ex.amount_cents), 0)::numeric
        / COALESCE(SUM(le.amount_cents), 1)::numeric
    ELSE 0::numeric
  END AS food_cost_percentage,
  GREATEST(
    e.quoted_price_cents - COALESCE(
      SUM(le.amount_cents) FILTER (WHERE le.is_refund = false AND le.entry_type != 'tip'),
      0
    ),
    0
  ) AS outstanding_balance_cents
FROM events e
LEFT JOIN ledger_entries le ON le.event_id = e.id
LEFT JOIN expenses ex ON ex.event_id = e.id
WHERE e.deleted_at IS NULL
GROUP BY e.id;

-- 2. Add cancelled_at to payment_plan_installments.
--    When an event is cancelled, outstanding installments are voided immediately.
--    This prevents payment reminder emails from firing for cancelled events.
ALTER TABLE payment_plan_installments
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Trigger: when an event transitions to 'cancelled', void all unpaid installments.
CREATE OR REPLACE FUNCTION void_installments_on_event_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    UPDATE payment_plan_installments
    SET cancelled_at = NOW()
    WHERE event_id = NEW.id
      AND paid_at IS NULL
      AND cancelled_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_void_installments_on_cancel ON events;
CREATE TRIGGER trg_void_installments_on_cancel
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION void_installments_on_event_cancel();
