-- =====================================================================================
-- MONTHLY RAFFLE SYSTEM
-- =====================================================================================
-- Migration: 20260328000009_monthly_raffle.sql
-- Description: Monthly raffle rounds with game-based entries, anonymous leaderboard,
--              provably fair automated drawing
-- Dependencies: Layer 1 (chefs, clients), user_roles
-- Date: March 28, 2026
-- =====================================================================================

-- =====================================================================================
-- ENUMS
-- =====================================================================================

DO $$ BEGIN
  CREATE TYPE raffle_round_status AS ENUM ('active', 'drawing', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE raffle_entry_source AS ENUM ('scratch_card', 'pan_catch', 'bonus');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================================
-- TABLE 1: raffle_rounds — one per month per tenant
-- =====================================================================================

CREATE TABLE IF NOT EXISTS raffle_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Round details
  month_label TEXT NOT NULL,
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  prize_description TEXT NOT NULL,
  status raffle_round_status DEFAULT 'active' NOT NULL,

  -- Winner (populated after drawing)
  winner_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  winner_alias TEXT,
  draw_seed TEXT,
  drawn_at TIMESTAMPTZ,
  prize_delivered BOOLEAN DEFAULT false NOT NULL,
  prize_delivered_at TIMESTAMPTZ,
  total_entries_at_draw INTEGER,
  total_participants_at_draw INTEGER,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- One active round per tenant per month
  CONSTRAINT raffle_rounds_month_unique UNIQUE (tenant_id, month_start),
  CONSTRAINT raffle_rounds_month_order CHECK (month_start < month_end)
);

COMMENT ON TABLE raffle_rounds IS 'Monthly raffle rounds. Chef defines a prize, clients earn entries via games, automated drawing selects winner.';

-- =====================================================================================
-- TABLE 2: raffle_entries — one per client per day per round
-- =====================================================================================

CREATE TABLE IF NOT EXISTS raffle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES raffle_rounds(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Identity + game
  alias_emoji TEXT NOT NULL,
  game_score INTEGER NOT NULL DEFAULT 0,
  source raffle_entry_source DEFAULT 'pan_catch' NOT NULL,
  entry_date DATE DEFAULT CURRENT_DATE NOT NULL,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- One entry per client per day per round
  CONSTRAINT raffle_entries_daily_unique UNIQUE (round_id, client_id, entry_date)
);

COMMENT ON TABLE raffle_entries IS 'Individual raffle entries earned by playing games. Max 1 per client per day per round. Anonymous via alias_emoji.';

-- Deferred FK for winner_entry
ALTER TABLE raffle_rounds
  ADD COLUMN IF NOT EXISTS winner_entry_id UUID REFERENCES raffle_entries(id) ON DELETE SET NULL;

-- =====================================================================================
-- INDEXES
-- =====================================================================================

CREATE INDEX IF NOT EXISTS idx_raffle_rounds_tenant ON raffle_rounds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_raffle_rounds_tenant_status ON raffle_rounds(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_raffle_rounds_tenant_month ON raffle_rounds(tenant_id, month_start);

CREATE INDEX IF NOT EXISTS idx_raffle_entries_round ON raffle_entries(round_id);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_client ON raffle_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_round_client ON raffle_entries(round_id, client_id);

-- =====================================================================================
-- RLS POLICIES
-- =====================================================================================

ALTER TABLE raffle_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_entries ENABLE ROW LEVEL SECURITY;

-- Chef: full access to own tenant's rounds
CREATE POLICY tenant_select_raffle_rounds ON raffle_rounds
  FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_insert_raffle_rounds ON raffle_rounds
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_update_raffle_rounds ON raffle_rounds
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Chef: full access to own tenant's entries
CREATE POLICY tenant_select_raffle_entries ON raffle_entries
  FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_insert_raffle_entries ON raffle_entries
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

-- Client: read own entries
CREATE POLICY client_read_own_raffle_entries ON raffle_entries
  FOR SELECT
  USING (
    client_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'client'
    )
  );

-- Client: read active/completed rounds for their tenant
CREATE POLICY client_read_raffle_rounds ON raffle_rounds
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT c.tenant_id FROM clients c
      INNER JOIN user_roles ur ON ur.entity_id = c.id
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'client'
    )
  );

-- Client: insert own entries
CREATE POLICY client_insert_raffle_entries ON raffle_entries
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'client'
    )
  );

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_raffle_rounds_updated_at
  BEFORE UPDATE ON raffle_rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();
