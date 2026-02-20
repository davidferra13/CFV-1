-- =====================================================================================
-- GIFT CARD REDEMPTION & PURCHASE FLOW
-- =====================================================================================
-- Migration: 20260227000001_gift_card_redemption_and_purchase.sql
-- Description: Adds remaining balance tracking, purchase intent state, redemption audit
--              table, and atomic redemption RPC to the existing vouchers/gift cards system.
-- Dependencies: 20260224000015_vouchers_and_gift_cards.sql (client_incentives table)
--               Layer 3 (ledger_entries, events, clients)
-- Date: February 27, 2026
-- =====================================================================================

-- =====================================================================================
-- STEP 1: Add 'gift_card' to payment_method enum
-- This allows ledger credit entries for gift card redemptions to be labeled accurately.
-- Additive — no existing data is affected.
-- =====================================================================================

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'gift_card';

-- =====================================================================================
-- STEP 2: Add new columns to client_incentives
-- All nullable / have defaults so existing rows are unaffected.
-- =====================================================================================

ALTER TABLE client_incentives
  ADD COLUMN IF NOT EXISTS remaining_balance_cents INTEGER,
  ADD COLUMN IF NOT EXISTS purchase_stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS purchase_status TEXT NOT NULL DEFAULT 'issued',
  ADD COLUMN IF NOT EXISTS purchased_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS purchased_by_email TEXT;

ALTER TABLE client_incentives
  ADD CONSTRAINT chk_incentive_purchase_status
    CHECK (purchase_status IN ('issued', 'pending_payment', 'paid'));

COMMENT ON COLUMN client_incentives.remaining_balance_cents IS 'For gift cards: remaining redeemable value in cents. Decremented on each partial redemption. NULL for vouchers.';
COMMENT ON COLUMN client_incentives.purchase_status IS 'issued = chef created; pending_payment = Stripe session open; paid = purchased by client via Stripe.';
COMMENT ON COLUMN client_incentives.purchased_by_user_id IS 'Auth user who bought this gift card (vs. the recipient).';
COMMENT ON COLUMN client_incentives.purchased_by_email IS 'Email of the buyer (for confirmation emails even if not an auth user).';

-- =====================================================================================
-- STEP 3: Trigger — auto-initialize remaining_balance_cents for gift cards
-- When a new gift card is inserted without remaining_balance_cents set,
-- default it to amount_cents. This ensures partial-balance tracking always starts right.
-- =====================================================================================

CREATE OR REPLACE FUNCTION initialize_gift_card_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type = 'gift_card' AND NEW.remaining_balance_cents IS NULL THEN
    NEW.remaining_balance_cents := NEW.amount_cents;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_gift_card_balance ON client_incentives;
CREATE TRIGGER trg_init_gift_card_balance
  BEFORE INSERT ON client_incentives
  FOR EACH ROW
  EXECUTE FUNCTION initialize_gift_card_balance();

-- =====================================================================================
-- STEP 4: gift_card_purchase_intents table
-- Holds pre-payment state for Stripe Checkout sessions initiated by clients
-- buying gift cards. The webhook reads this table to know what gift card to create.
-- Without this table, webhook metadata would be insufficient and non-auditable.
-- =====================================================================================

CREATE TABLE IF NOT EXISTS gift_card_purchase_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Stripe reference (set after checkout session is created)
  stripe_checkout_session_id TEXT,

  -- Gift card details as chosen by buyer
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency_code TEXT NOT NULL DEFAULT 'USD',
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  personal_message TEXT,

  -- Buyer identity (may be a logged-in user or a guest)
  buyer_user_id UUID REFERENCES auth.users(id),
  buyer_email TEXT NOT NULL,

  -- Status lifecycle: pending → paid (or failed/expired)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired')),

  -- Set after webhook fires successfully
  created_incentive_id UUID REFERENCES client_incentives(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Checkout sessions expire; we expire intents after 24h
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),

  CONSTRAINT chk_purchase_intent_recipient_email CHECK (
    position('@' in recipient_email) > 1
  ),
  CONSTRAINT chk_purchase_intent_buyer_email CHECK (
    position('@' in buyer_email) > 1
  )
);

COMMENT ON TABLE gift_card_purchase_intents IS 'Pre-payment state for Stripe Checkout gift card purchases. One row per purchase attempt. Webhook updates status to paid and links created_incentive_id.';

CREATE INDEX IF NOT EXISTS idx_gift_card_purchase_intents_tenant ON gift_card_purchase_intents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_purchase_intents_session ON gift_card_purchase_intents(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gift_card_purchase_intents_status ON gift_card_purchase_intents(status, created_at);

-- RLS: Webhook uses service role (bypasses RLS). Chefs can view their tenant's intents.
ALTER TABLE gift_card_purchase_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gift_card_purchase_intents_chef_select ON gift_card_purchase_intents;
CREATE POLICY gift_card_purchase_intents_chef_select ON gift_card_purchase_intents
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

-- =====================================================================================
-- STEP 5: incentive_redemptions table
-- Immutable audit log. One row per redemption event (a code used against an event).
-- Mirrors ledger_entries in that it is append-only.
-- =====================================================================================

CREATE TABLE IF NOT EXISTS incentive_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incentive_id UUID NOT NULL REFERENCES client_incentives(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id),

  -- Snapshot of incentive state at time of redemption (never rely on parent row for history)
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('voucher', 'gift_card')),

  -- Actual value applied (in cents for fixed; NULL for percent-based)
  applied_amount_cents INTEGER NOT NULL CHECK (applied_amount_cents > 0),
  applied_discount_percent INTEGER,

  -- Gift card balance tracking (NULL for vouchers)
  balance_before_cents INTEGER,
  balance_after_cents INTEGER,

  -- Link to the ledger credit entry created by this redemption
  ledger_entry_id UUID REFERENCES ledger_entries(id),

  redeemed_by_user_id UUID REFERENCES auth.users(id),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE incentive_redemptions IS 'Immutable audit log of voucher/gift card redemptions. One row per use against an event. Never update or delete.';

CREATE INDEX IF NOT EXISTS idx_incentive_redemptions_tenant ON incentive_redemptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incentive_redemptions_incentive ON incentive_redemptions(incentive_id);
CREATE INDEX IF NOT EXISTS idx_incentive_redemptions_event ON incentive_redemptions(event_id);
CREATE INDEX IF NOT EXISTS idx_incentive_redemptions_client ON incentive_redemptions(client_id);
CREATE INDEX IF NOT EXISTS idx_incentive_redemptions_redeemed_at ON incentive_redemptions(redeemed_at DESC);

ALTER TABLE incentive_redemptions ENABLE ROW LEVEL SECURITY;

-- Chef sees all redemptions within their tenant
DROP POLICY IF EXISTS incentive_redemptions_chef_select ON incentive_redemptions;
CREATE POLICY incentive_redemptions_chef_select ON incentive_redemptions
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

-- Client sees their own redemptions
DROP POLICY IF EXISTS incentive_redemptions_client_select ON incentive_redemptions;
CREATE POLICY incentive_redemptions_client_select ON incentive_redemptions
  FOR SELECT USING (
    get_current_user_role() = 'client'
    AND client_id = get_current_client_id()
  );

-- =====================================================================================
-- STEP 6: Atomic redemption RPC
-- Called from the server action; runs as a single DB transaction.
-- Inserts ledger credit → updates incentive balance → inserts redemption audit row.
-- SECURITY DEFINER so it can write to ledger_entries (which has restrictive RLS).
-- =====================================================================================

CREATE OR REPLACE FUNCTION redeem_incentive(
  p_incentive_id UUID,
  p_event_id UUID,
  p_client_id UUID,
  p_tenant_id UUID,
  p_applied_cents INTEGER,
  p_incentive_type TEXT,
  p_code TEXT,
  p_balance_before_cents INTEGER,
  p_redeemed_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ledger_id UUID;
  v_balance_after INTEGER;
  v_description TEXT;
BEGIN
  -- Build a clear description for the ledger entry
  v_description := 'Gift card/voucher ' || p_code || ' applied — $' ||
    TRIM(TO_CHAR(p_applied_cents::DECIMAL / 100, 'FM999999990.00'));

  -- 1. Insert the ledger credit entry (source of financial truth)
  INSERT INTO ledger_entries (
    tenant_id,
    client_id,
    event_id,
    entry_type,
    amount_cents,
    payment_method,
    description,
    internal_notes,
    created_by
  ) VALUES (
    p_tenant_id,
    p_client_id,
    p_event_id,
    'credit',
    p_applied_cents,
    'gift_card',
    v_description,
    'Incentive ID: ' || p_incentive_id::TEXT || ', type: ' || p_incentive_type,
    p_redeemed_by
  ) RETURNING id INTO v_ledger_id;

  -- 2. Update the incentive (decrement balance for gift cards, always increment redemptions_used)
  IF p_incentive_type = 'gift_card' THEN
    v_balance_after := p_balance_before_cents - p_applied_cents;
    UPDATE client_incentives
      SET remaining_balance_cents = v_balance_after,
          redemptions_used = redemptions_used + 1
      WHERE id = p_incentive_id;
  ELSE
    v_balance_after := NULL;
    UPDATE client_incentives
      SET redemptions_used = redemptions_used + 1
      WHERE id = p_incentive_id;
  END IF;

  -- 3. Insert the immutable redemption audit record
  INSERT INTO incentive_redemptions (
    incentive_id,
    tenant_id,
    event_id,
    client_id,
    code,
    type,
    applied_amount_cents,
    balance_before_cents,
    balance_after_cents,
    ledger_entry_id,
    redeemed_by_user_id
  ) VALUES (
    p_incentive_id,
    p_tenant_id,
    p_event_id,
    p_client_id,
    p_code,
    p_incentive_type,
    p_applied_cents,
    p_balance_before_cents,
    v_balance_after,
    v_ledger_id,
    p_redeemed_by
  );

  RETURN v_ledger_id;
END;
$$;

COMMENT ON FUNCTION redeem_incentive IS 'Atomically applies a voucher/gift card to an event: inserts ledger credit, decrements gift card balance, inserts audit row. Must be called via supabase.rpc() from server-side code only.';

-- =====================================================================================
-- END
-- =====================================================================================
