-- Stripe Transfer Routing
-- Enables destination charges: payments route to chef's connected Stripe Express account
-- with optional platform application fees.
-- All changes are additive — no drops, no renames, no data modification.

------------------------------------------------------------
-- 1. New columns on chefs for platform fee configuration
------------------------------------------------------------

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS platform_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS platform_fee_fixed_cents INTEGER NOT NULL DEFAULT 0;

ALTER TABLE chefs
  ADD CONSTRAINT chefs_platform_fee_percent_range
    CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100);

ALTER TABLE chefs
  ADD CONSTRAINT chefs_platform_fee_fixed_cents_range
    CHECK (platform_fee_fixed_cents >= 0);

COMMENT ON COLUMN chefs.platform_fee_percent IS
  'Platform commission percentage (e.g. 5.00 = 5%). Applied as application_fee_amount on Stripe destination charges.';
COMMENT ON COLUMN chefs.platform_fee_fixed_cents IS
  'Fixed platform fee in cents added on top of percentage fee per transaction. Default 0.';

------------------------------------------------------------
-- 2. stripe_transfers — tracks every transfer to connected accounts
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stripe_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  event_id UUID REFERENCES events(id),

  -- Stripe identifiers
  stripe_transfer_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_destination_account TEXT NOT NULL,

  -- Financial
  gross_amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  net_transfer_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'reversed')),

  -- Deferred transfer tracking (for chefs without ready Connect at payment time)
  is_deferred BOOLEAN NOT NULL DEFAULT false,
  deferred_resolved_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_transfers_tenant ON stripe_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transfers_event ON stripe_transfers(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transfers_status ON stripe_transfers(status);

-- RLS
ALTER TABLE stripe_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs can view own transfers" ON stripe_transfers;
CREATE POLICY "Chefs can view own transfers"
  ON stripe_transfers FOR SELECT
  USING (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access on stripe_transfers" ON stripe_transfers;
CREATE POLICY "Service role full access on stripe_transfers"
  ON stripe_transfers FOR ALL
  USING (auth.role() = 'service_role');

------------------------------------------------------------
-- 3. platform_fee_ledger — append-only platform revenue tracking
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_fee_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  event_id UUID REFERENCES events(id),
  stripe_transfer_id TEXT,

  entry_type TEXT NOT NULL DEFAULT 'fee'
    CHECK (entry_type IN ('fee', 'fee_refund', 'adjustment')),

  amount_cents INTEGER NOT NULL,
  description TEXT NOT NULL,

  -- Stripe metadata
  stripe_payment_intent_id TEXT,
  stripe_application_fee_id TEXT,

  -- Idempotency key (Stripe event ID)
  transaction_reference TEXT UNIQUE,
  internal_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutability trigger (same pattern as ledger_entries)
CREATE OR REPLACE FUNCTION prevent_platform_fee_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'platform_fee_ledger entries are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_platform_fee_ledger_immutability
  BEFORE UPDATE OR DELETE ON platform_fee_ledger
  FOR EACH ROW
  EXECUTE FUNCTION prevent_platform_fee_ledger_mutation();

CREATE INDEX IF NOT EXISTS idx_platform_fee_ledger_tenant ON platform_fee_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_fee_ledger_event ON platform_fee_ledger(event_id);

-- RLS: service role only (admin visibility, chefs don't see platform fee internals)
ALTER TABLE platform_fee_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on platform_fee_ledger" ON platform_fee_ledger;
CREATE POLICY "Service role full access on platform_fee_ledger"
  ON platform_fee_ledger FOR ALL
  USING (auth.role() = 'service_role');
