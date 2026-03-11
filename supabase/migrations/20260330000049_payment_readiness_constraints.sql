-- ============================================================
-- Migration: Payment readiness integrity constraints
-- Purpose:
--   1) Require valid pricing fields before an event can enter payable/live states.
--   2) Prevent orphaned deposits (deposit without a quoted price).
-- Notes:
--   - Constraints are added NOT VALID for safe rollout.
--   - Existing rows are not back-validated until explicit VALIDATE CONSTRAINT.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_payable_status_requires_pricing'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_payable_status_requires_pricing
      CHECK (
        status NOT IN ('accepted', 'paid', 'confirmed', 'in_progress', 'completed')
        OR (
          quoted_price_cents IS NOT NULL
          AND quoted_price_cents > 0
          AND pricing_model IS NOT NULL
          AND (deposit_amount_cents IS NULL OR deposit_amount_cents >= 0)
          AND (deposit_amount_cents IS NULL OR deposit_amount_cents <= quoted_price_cents)
        )
      ) NOT VALID;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_deposit_requires_quoted_price'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_deposit_requires_quoted_price
      CHECK (deposit_amount_cents IS NULL OR quoted_price_cents IS NOT NULL) NOT VALID;
  END IF;
END
$$;
