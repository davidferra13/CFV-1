-- Add CHECK constraint on chefs.subscription_status to prevent garbage values.
-- Valid values are Stripe subscription statuses plus 'grandfathered' (custom).
-- NULL is allowed (no subscription).

ALTER TABLE chefs
  ADD CONSTRAINT chefs_subscription_status_check
  CHECK (
    subscription_status IS NULL
    OR subscription_status = ANY (ARRAY[
      'active',
      'trialing',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'paused',
      'grandfathered'
    ])
  );
