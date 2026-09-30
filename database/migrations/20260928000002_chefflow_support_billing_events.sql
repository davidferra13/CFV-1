-- Append-only billing evidence for ChefFlow voluntary support.
-- Stores financial identifiers and amounts only; no supporter-facing PII.
CREATE TABLE IF NOT EXISTS public.chefflow_support_billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  record_key TEXT NOT NULL UNIQUE,
  stripe_event_id TEXT UNIQUE,
  event_kind TEXT NOT NULL CHECK (event_kind IN ('payment', 'refund_snapshot')),
  support_frequency TEXT NOT NULL CHECK (support_frequency IN ('one_time', 'monthly')),
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_invoice_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_balance_transaction_id TEXT,
  gross_amount_cents INTEGER NOT NULL CHECK (gross_amount_cents >= 0),
  refunded_amount_cents INTEGER NOT NULL DEFAULT 0
    CHECK (refunded_amount_cents >= 0 AND refunded_amount_cents <= gross_amount_cents),
  stripe_fee_cents INTEGER CHECK (stripe_fee_cents IS NULL OR stripe_fee_cents >= 0),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chefflow_support_billing_events_chef
  ON public.chefflow_support_billing_events (chef_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_chefflow_support_billing_events_payment_intent
  ON public.chefflow_support_billing_events (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chefflow_support_billing_events_charge
  ON public.chefflow_support_billing_events (stripe_charge_id)
  WHERE stripe_charge_id IS NOT NULL;
