-- =====================================================================================
-- LOYALTY PROGRAM
-- =====================================================================================
-- Migration: 20260216000002_loyalty_program.sql
-- Description: Loyalty transactions, rewards catalog, tier management, config
--              Points per guest served, milestone bonuses, service-denominated rewards
-- Dependencies: Layers 1, 3 (clients, events)
-- Date: February 16, 2026
-- =====================================================================================

-- =====================================================================================
-- ENUMS
-- =====================================================================================

-- Transaction types for the loyalty ledger
CREATE TYPE loyalty_transaction_type AS ENUM (
  'earned',       -- points from completed events
  'redeemed',     -- points spent on rewards
  'bonus',        -- manual bonus from chef
  'adjustment',   -- admin correction
  'expired'       -- expired points (future use)
);

-- Reward types (service-denominated, never cash)
CREATE TYPE loyalty_reward_type AS ENUM (
  'discount_fixed',   -- e.g. $25 off next dinner
  'discount_percent', -- e.g. 15% off
  'free_course',      -- complimentary course
  'free_dinner',      -- full dinner coverage
  'upgrade'           -- bonus courses, tasting menu upgrade
);

-- Loyalty tier enum (replaces untyped TEXT on clients)
CREATE TYPE loyalty_tier AS ENUM (
  'bronze',
  'silver',
  'gold',
  'platinum'
);

-- =====================================================================================
-- TABLE 1: loyalty_transactions (append-only ledger)
-- =====================================================================================
-- Every point earn/redeem/bonus is an immutable record. Client balance is derived.

CREATE TABLE loyalty_transactions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Transaction details
  type loyalty_transaction_type NOT NULL,
  points INTEGER NOT NULL,
  description TEXT NOT NULL,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT loyalty_transactions_points_direction CHECK (
    (type IN ('earned', 'bonus') AND points > 0) OR
    (type = 'redeemed' AND points < 0) OR
    (type IN ('adjustment', 'expired'))
  )
);

COMMENT ON TABLE loyalty_transactions IS 'Append-only ledger of all loyalty point changes. Never update or delete.';

-- =====================================================================================
-- TABLE 2: loyalty_rewards (reward catalog)
-- =====================================================================================
-- Service-denominated rewards the chef offers. Chef never spends money on rewards.

CREATE TABLE loyalty_rewards (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Reward details
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type loyalty_reward_type NOT NULL,
  reward_value_cents INTEGER,      -- for discount_fixed
  reward_percent INTEGER,          -- for discount_percent

  -- State
  is_active BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT loyalty_rewards_points_positive CHECK (points_required > 0),
  CONSTRAINT loyalty_rewards_value_check CHECK (
    (reward_type = 'discount_fixed' AND reward_value_cents > 0) OR
    (reward_type = 'discount_percent' AND reward_percent > 0 AND reward_percent <= 100) OR
    (reward_type NOT IN ('discount_fixed', 'discount_percent'))
  )
);

COMMENT ON TABLE loyalty_rewards IS 'Service-denominated reward catalog. The chef never spends money — rewards are time and cooking.';

-- =====================================================================================
-- TABLE 3: loyalty_config (per-tenant program settings)
-- =====================================================================================

CREATE TABLE loyalty_config (
  -- Identity (one row per tenant)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Point rules
  points_per_guest INTEGER DEFAULT 10 NOT NULL,
  bonus_large_party_threshold INTEGER DEFAULT 8,
  bonus_large_party_points INTEGER DEFAULT 20,

  -- Milestone bonuses (JSON array: [{events: 5, bonus: 50}, {events: 10, bonus: 100}])
  milestone_bonuses JSONB DEFAULT '[{"events": 5, "bonus": 50}, {"events": 10, "bonus": 100}]'::jsonb NOT NULL,

  -- Tier thresholds (cumulative lifetime points to reach tier)
  tier_bronze_min INTEGER DEFAULT 0 NOT NULL,
  tier_silver_min INTEGER DEFAULT 200 NOT NULL,
  tier_gold_min INTEGER DEFAULT 500 NOT NULL,
  tier_platinum_min INTEGER DEFAULT 1000 NOT NULL,

  -- Program state
  is_active BOOLEAN DEFAULT true NOT NULL,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- One config per tenant
  CONSTRAINT loyalty_config_tenant_unique UNIQUE (tenant_id),
  CONSTRAINT loyalty_config_thresholds_ascending CHECK (
    tier_bronze_min < tier_silver_min AND
    tier_silver_min < tier_gold_min AND
    tier_gold_min < tier_platinum_min
  )
);

COMMENT ON TABLE loyalty_config IS 'Per-tenant loyalty program configuration. One row per chef.';

-- =====================================================================================
-- ALTER: Add columns to existing tables
-- =====================================================================================

-- Add total_guests_served and total_events_completed to clients
-- (loyalty_points and loyalty_tier already exist from Layer 1)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_guests_served INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_events_completed INTEGER DEFAULT 0;

-- Convert loyalty_tier from TEXT to the new enum
-- (Drop the old text column and recreate as enum — the column has no data yet)
ALTER TABLE clients DROP COLUMN IF EXISTS loyalty_tier;
ALTER TABLE clients ADD COLUMN loyalty_tier loyalty_tier DEFAULT 'bronze' NOT NULL;

-- Add loyalty_points_awarded flag to events (for the closure checklist pattern)
ALTER TABLE events ADD COLUMN IF NOT EXISTS loyalty_points_awarded BOOLEAN DEFAULT false NOT NULL;

-- =====================================================================================
-- INDEXES
-- =====================================================================================

CREATE INDEX idx_loyalty_transactions_tenant ON loyalty_transactions(tenant_id);
CREATE INDEX idx_loyalty_transactions_client ON loyalty_transactions(client_id);
CREATE INDEX idx_loyalty_transactions_event ON loyalty_transactions(event_id);
CREATE INDEX idx_loyalty_transactions_tenant_client ON loyalty_transactions(tenant_id, client_id);
CREATE INDEX idx_loyalty_transactions_type ON loyalty_transactions(type);

CREATE INDEX idx_loyalty_rewards_tenant ON loyalty_rewards(tenant_id);
CREATE INDEX idx_loyalty_rewards_active ON loyalty_rewards(tenant_id, is_active);

CREATE INDEX idx_loyalty_config_tenant ON loyalty_config(tenant_id);

CREATE INDEX idx_clients_loyalty_tier ON clients(tenant_id, loyalty_tier);
CREATE INDEX idx_clients_loyalty_points ON clients(tenant_id, loyalty_points);

-- =====================================================================================
-- RLS POLICIES
-- =====================================================================================

-- loyalty_transactions: append-only, tenant-isolated
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select_loyalty_transactions ON loyalty_transactions;
CREATE POLICY tenant_isolation_select_loyalty_transactions ON loyalty_transactions
  FOR SELECT USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert_loyalty_transactions ON loyalty_transactions;
CREATE POLICY tenant_isolation_insert_loyalty_transactions ON loyalty_transactions
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

-- No UPDATE or DELETE policies — append-only

-- loyalty_rewards: full CRUD, tenant-isolated
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select_loyalty_rewards ON loyalty_rewards;
CREATE POLICY tenant_isolation_select_loyalty_rewards ON loyalty_rewards
  FOR SELECT USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert_loyalty_rewards ON loyalty_rewards;
CREATE POLICY tenant_isolation_insert_loyalty_rewards ON loyalty_rewards
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update_loyalty_rewards ON loyalty_rewards;
CREATE POLICY tenant_isolation_update_loyalty_rewards ON loyalty_rewards
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- loyalty_config: read/write, tenant-isolated
ALTER TABLE loyalty_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select_loyalty_config ON loyalty_config;
CREATE POLICY tenant_isolation_select_loyalty_config ON loyalty_config
  FOR SELECT USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert_loyalty_config ON loyalty_config;
CREATE POLICY tenant_isolation_insert_loyalty_config ON loyalty_config
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update_loyalty_config ON loyalty_config;
CREATE POLICY tenant_isolation_update_loyalty_config ON loyalty_config
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Client-side read access to loyalty_transactions (own records only)
DROP POLICY IF EXISTS client_read_own_loyalty_transactions ON loyalty_transactions;
CREATE POLICY client_read_own_loyalty_transactions ON loyalty_transactions
  FOR SELECT
  USING (
    client_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'client'
    )
  );

-- Client-side read access to loyalty_rewards (active only)
DROP POLICY IF EXISTS client_read_active_loyalty_rewards ON loyalty_rewards;
CREATE POLICY client_read_active_loyalty_rewards ON loyalty_rewards
  FOR SELECT
  USING (
    is_active = true AND
    tenant_id IN (
      SELECT c.tenant_id FROM clients c
      INNER JOIN user_roles ur ON ur.entity_id = c.id
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'client'
    )
  );

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Immutability trigger on loyalty_transactions (append-only)
CREATE OR REPLACE FUNCTION prevent_loyalty_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'loyalty_transactions are immutable. No updates or deletes allowed.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_loyalty_transaction_immutability
  BEFORE UPDATE OR DELETE ON loyalty_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_loyalty_transaction_mutation();

-- Auto-update updated_at on loyalty_rewards
CREATE TRIGGER update_loyalty_rewards_updated_at
  BEFORE UPDATE ON loyalty_rewards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

-- Auto-update updated_at on loyalty_config
CREATE TRIGGER update_loyalty_config_updated_at
  BEFORE UPDATE ON loyalty_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

-- =====================================================================================
-- DEFAULT REWARDS (inserted per-tenant on first config creation via app code)
-- =====================================================================================
-- Default rewards are seeded by the application when getLoyaltyConfig() is first called.
-- This keeps the migration clean and allows per-tenant customization.

-- =====================================================================================
-- SUMMARY
-- =====================================================================================
-- Tables created: loyalty_transactions, loyalty_rewards, loyalty_config (3)
-- Enums created: loyalty_transaction_type, loyalty_reward_type, loyalty_tier (3)
-- Columns added: clients.total_guests_served, clients.total_events_completed,
--                clients.loyalty_tier (converted to enum), events.loyalty_points_awarded
-- Indexes: 10
-- RLS Policies: 8 (chef + client access)
-- Triggers: 3 (immutability, updated_at x2)
-- END OF LOYALTY PROGRAM MIGRATION
