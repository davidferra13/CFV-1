-- B1: Remove GREATEST(0) clamp from outstanding_balance_cents
-- Allows negative values to surface overpayment (client paid more than quoted).
-- Previous behavior silently clamped to 0, hiding the overage from the chef.
-- Tips are still excluded from outstanding calculation (correct).

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
  -- B1: Allow negative to surface overpayment. Negative = client overpaid by that amount.
  e.quoted_price_cents - COALESCE(
    SUM(le.amount_cents) FILTER (WHERE le.is_refund = false AND le.entry_type != 'tip'),
    0
  ) AS outstanding_balance_cents
FROM events e
LEFT JOIN ledger_entries le ON le.event_id = e.id
LEFT JOIN expenses ex ON ex.event_id = e.id
GROUP BY e.id;
