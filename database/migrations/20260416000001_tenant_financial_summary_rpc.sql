-- DB-side aggregation for tenant financial summary
-- Replaces the JS loop that pulled up to 50K rows into memory.
-- Scales to any number of ledger entries without OOM risk.

CREATE OR REPLACE FUNCTION compute_tenant_financial_summary(p_tenant_id UUID)
RETURNS TABLE (
  total_revenue_cents BIGINT,
  total_refunds_cents BIGINT,
  total_tips_cents BIGINT
) LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(SUM(
      CASE
        WHEN NOT is_refund AND entry_type != 'refund' AND entry_type != 'tip'
        THEN amount_cents
        ELSE 0
      END
    ), 0) AS total_revenue_cents,

    COALESCE(SUM(
      CASE
        WHEN is_refund OR entry_type = 'refund'
        THEN ABS(amount_cents)
        ELSE 0
      END
    ), 0) AS total_refunds_cents,

    COALESCE(SUM(
      CASE
        WHEN entry_type = 'tip' AND NOT is_refund
        THEN amount_cents
        ELSE 0
      END
    ), 0) AS total_tips_cents

  FROM ledger_entries
  WHERE tenant_id = p_tenant_id;
$$;
