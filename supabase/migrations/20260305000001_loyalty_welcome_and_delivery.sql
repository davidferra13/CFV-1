-- Loyalty: Welcome Points Config + Reward Delivery Tracking
-- Adds welcome_points and referral_points config columns.
-- Adds has_received_welcome_points flag on clients (idempotency guard).
-- Adds loyalty_reward_redemptions table for pending delivery tracking.

-- ─── 1. Extend loyalty_config ────────────────────────────────────────────────
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS welcome_points integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS referral_points integer NOT NULL DEFAULT 100;

COMMENT ON COLUMN loyalty_config.welcome_points IS
  'Points automatically awarded when a client joins via invitation. Set to 0 to disable.';
COMMENT ON COLUMN loyalty_config.referral_points IS
  'Points awarded to the referring client when a referred client completes their first event.';

-- ─── 2. Idempotency guard on clients ────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS has_received_welcome_points boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN clients.has_received_welcome_points IS
  'Prevents double-awarding welcome points. Set to true after first welcome bonus.';

-- ─── 3. Reward delivery tracking ────────────────────────────────────────────
-- When a client redeems a loyalty reward, a row is created here so the chef
-- knows what service to deliver at the next event.
-- This is an append-style audit table — delivery_status tracks lifecycle.

CREATE TABLE IF NOT EXISTS loyalty_reward_redemptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id              uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  loyalty_transaction_id uuid NOT NULL REFERENCES loyalty_transactions(id),
  reward_id              uuid NOT NULL REFERENCES loyalty_rewards(id),
  reward_name            text NOT NULL, -- snapshot at time of redemption
  reward_type            text NOT NULL, -- snapshot
  points_spent           integer NOT NULL,
  delivery_status        text NOT NULL DEFAULT 'pending'
                          CHECK (delivery_status IN ('pending', 'delivered', 'cancelled')),
  event_id               uuid REFERENCES events(id) ON DELETE SET NULL,
  delivered_at           timestamptz,
  delivery_note          text,
  redeemed_by            text NOT NULL DEFAULT 'client'
                          CHECK (redeemed_by IN ('client', 'chef')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lrr_tenant
  ON loyalty_reward_redemptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lrr_client_status
  ON loyalty_reward_redemptions(client_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_lrr_pending_tenant
  ON loyalty_reward_redemptions(tenant_id, delivery_status)
  WHERE delivery_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_lrr_event
  ON loyalty_reward_redemptions(event_id)
  WHERE event_id IS NOT NULL;

-- ─── 4. Updated_at trigger ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_lrr_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_loyalty_reward_redemptions_updated_at
  BEFORE UPDATE ON loyalty_reward_redemptions
  FOR EACH ROW EXECUTE FUNCTION trg_lrr_updated_at();

-- ─── 5. Row-level security ───────────────────────────────────────────────────
ALTER TABLE loyalty_reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Chef: full access to their tenant's records
CREATE POLICY "lrr_chef_all" ON loyalty_reward_redemptions
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Client: read own redemption records
CREATE POLICY "lrr_client_select" ON loyalty_reward_redemptions
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'client'
    )
  );
