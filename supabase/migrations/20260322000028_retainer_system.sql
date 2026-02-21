-- Retainer/Subscription System
-- Models recurring client agreements with billing period tracking
-- and event linking. Payments flow through the existing ledger.
-- Additive only — no existing tables modified beyond ALTER TABLE additions.

-- ============================================
-- ENUM: Add 'retainer' to ledger_entry_type
-- ============================================
ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS 'retainer';

-- ============================================
-- TABLE 1: RETAINERS
-- ============================================

CREATE TABLE IF NOT EXISTS retainers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,

  -- Terms
  name                  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'paused', 'cancelled', 'completed')),
  billing_cycle         TEXT NOT NULL DEFAULT 'monthly'
                        CHECK (billing_cycle IN ('weekly', 'biweekly', 'monthly')),
  amount_cents          INTEGER NOT NULL CHECK (amount_cents >= 0),

  -- Inclusions (nullable = unlimited)
  includes_events_count INTEGER,
  includes_hours        NUMERIC(8,2),

  -- Date range
  start_date            DATE NOT NULL,
  end_date              DATE,                -- NULL = ongoing
  next_billing_date     DATE,

  -- Stripe (optional)
  stripe_subscription_id TEXT,
  stripe_price_id        TEXT,

  -- Notes
  notes                 TEXT,
  terms_summary         TEXT,               -- Human-readable terms for client portal

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retainers_tenant_status ON retainers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_retainers_client ON retainers(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_retainers_next_billing ON retainers(tenant_id, next_billing_date)
  WHERE status = 'active';

COMMENT ON TABLE retainers IS 'Recurring service agreements between chef and client. Financial truth lives in ledger_entries.';

CREATE TRIGGER trg_retainers_updated_at
  BEFORE UPDATE ON retainers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: RETAINER PERIODS
-- ============================================

CREATE TABLE IF NOT EXISTS retainer_periods (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retainer_id       UUID NOT NULL REFERENCES retainers(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'overdue', 'void')),
  amount_cents      INTEGER NOT NULL CHECK (amount_cents >= 0),

  -- Usage tracking
  events_used       INTEGER NOT NULL DEFAULT 0,
  hours_used        NUMERIC(8,2) NOT NULL DEFAULT 0,

  -- Payment tracking
  stripe_invoice_id TEXT,
  ledger_entry_id   UUID,               -- FK to ledger_entries when payment recorded
  paid_at           TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT period_dates_valid CHECK (period_end > period_start)
);

CREATE INDEX IF NOT EXISTS idx_retainer_periods_retainer ON retainer_periods(retainer_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_retainer_periods_tenant ON retainer_periods(tenant_id, status);

COMMENT ON TABLE retainer_periods IS 'Individual billing periods within a retainer agreement. status tracks payment; usage tracks events/hours consumed.';

CREATE TRIGGER trg_retainer_periods_updated_at
  BEFORE UPDATE ON retainer_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ALTER EVENTS: Add retainer FK columns
-- ============================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS retainer_id        UUID REFERENCES retainers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retainer_period_id UUID REFERENCES retainer_periods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_retainer ON events(retainer_id) WHERE retainer_id IS NOT NULL;

COMMENT ON COLUMN events.retainer_id IS 'If this event is part of a retainer agreement, links to the retainer';
COMMENT ON COLUMN events.retainer_period_id IS 'Specific billing period this event counts against';

-- ============================================
-- ALTER CLIENTS: Add Stripe customer ID
-- ============================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN clients.stripe_customer_id IS 'Stripe Customer ID for retainer billing. Created on-demand when a retainer subscription is set up.';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE retainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainer_periods ENABLE ROW LEVEL SECURITY;

-- Chef policies
CREATE POLICY retainers_chef_all ON retainers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.entity_id = retainers.tenant_id
        AND user_roles.auth_user_id = auth.uid()
        AND user_roles.role = 'chef'
    )
  );

CREATE POLICY retainer_periods_chef_all ON retainer_periods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.entity_id = retainer_periods.tenant_id
        AND user_roles.auth_user_id = auth.uid()
        AND user_roles.role = 'chef'
    )
  );

-- Client policies (read their own retainers)
CREATE POLICY retainers_client_select ON retainers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = retainers.client_id
        AND clients.auth_user_id = auth.uid()
    )
  );

CREATE POLICY retainer_periods_client_select ON retainer_periods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM retainers r
      JOIN clients c ON c.id = r.client_id
      WHERE r.id = retainer_periods.retainer_id
        AND c.auth_user_id = auth.uid()
    )
  );
