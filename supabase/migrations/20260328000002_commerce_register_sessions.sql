-- Commerce Engine V1 — Wave 2: Register Sessions & Order Queue
-- Adds POS shift management and order-ahead workflow.

-- ─── Register Session Status ────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE register_session_status AS ENUM ('open', 'suspended', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Order Queue Status ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE order_queue_status AS ENUM ('received', 'preparing', 'ready', 'picked_up', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Register Sessions ──────────────────────────────────────────
-- POS shift management: tracks cash in drawer, who's operating, sales count.
CREATE TABLE IF NOT EXISTS register_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Session info
  session_name      TEXT,                       -- e.g. "Morning Shift", "Lunch Rush"
  status            register_session_status NOT NULL DEFAULT 'open',

  -- Timing
  opened_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at         TIMESTAMPTZ,
  suspended_at      TIMESTAMPTZ,

  -- Staff
  opened_by         UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Cash tracking
  opening_cash_cents    INTEGER NOT NULL DEFAULT 0,
  closing_cash_cents    INTEGER,
  expected_cash_cents   INTEGER,                -- computed at close time
  cash_variance_cents   INTEGER,                -- closing - expected

  -- Counters (denormalized for dashboard speed)
  total_sales_count     INTEGER NOT NULL DEFAULT 0,
  total_revenue_cents   INTEGER NOT NULL DEFAULT 0,
  total_tips_cents      INTEGER NOT NULL DEFAULT 0,

  -- Notes
  notes             TEXT,
  close_notes       TEXT,

  CHECK (opening_cash_cents >= 0)
);

-- ─── FK: Link sales to register sessions ────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'register_session_id'
  ) THEN
    ALTER TABLE sales
      ADD COLUMN register_session_id UUID REFERENCES register_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── Order Queue ────────────────────────────────────────────────
-- Tracks order-ahead items through prep → ready → pickup.
CREATE TABLE IF NOT EXISTS order_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Linked sale
  sale_id           UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,

  -- Status tracking
  status            order_queue_status NOT NULL DEFAULT 'received',
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  preparing_at      TIMESTAMPTZ,
  ready_at          TIMESTAMPTZ,
  picked_up_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,

  -- Customer info (for display board — may not have a client record)
  customer_name     TEXT,
  order_number      TEXT,                       -- short display code: "A-042"

  -- Scheduling
  estimated_ready_at  TIMESTAMPTZ,              -- when customer expects pickup
  actual_wait_minutes INTEGER,                  -- computed at pickup

  -- Staff
  assigned_to       UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Notes
  notes             TEXT,
  cancel_reason     TEXT,

  UNIQUE (tenant_id, order_number)
);

-- ─── Auto-generate order numbers ────────────────────────────────
-- Format: A-NNN (resets daily, letter cycles A-Z)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today_count INTEGER;
  letter CHAR(1);
  num TEXT;
BEGIN
  -- Count today's orders for this tenant
  SELECT COUNT(*) + 1 INTO today_count
  FROM order_queue
  WHERE tenant_id = NEW.tenant_id
    AND created_at::date = CURRENT_DATE;

  -- Letter cycles A-Z based on day of month
  letter := CHR(64 + (EXTRACT(DOY FROM CURRENT_DATE)::integer % 26) + 1);

  -- 3-digit padded number
  num := LPAD(today_count::text, 3, '0');

  NEW.order_number := letter || '-' || num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_order_number_trigger ON order_queue;
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON order_queue
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- ─── Auto-update timestamps ─────────────────────────────────────
DROP TRIGGER IF EXISTS update_register_sessions_updated_at ON register_sessions;
CREATE TRIGGER update_register_sessions_updated_at
  BEFORE UPDATE ON register_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_queue_updated_at ON order_queue;
CREATE TRIGGER update_order_queue_updated_at
  BEFORE UPDATE ON order_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Inventory: add sale_id to inventory_transactions ───────────
-- So we can link sale-based deductions to inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_transactions' AND column_name = 'sale_id'
  ) THEN
    ALTER TABLE inventory_transactions
      ADD COLUMN sale_id UUID REFERENCES sales(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add sale_deduction and return_from_sale to transaction_type enum
DO $$
BEGIN
  ALTER TYPE inventory_transaction_type ADD VALUE IF NOT EXISTS 'sale_deduction';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE inventory_transaction_type ADD VALUE IF NOT EXISTS 'return_from_sale';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── RLS ─────────────────────────────────────────────────────────
ALTER TABLE register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_queue ENABLE ROW LEVEL SECURITY;

-- Chef full access
DROP POLICY IF EXISTS register_sessions_chef_all ON register_sessions;
CREATE POLICY register_sessions_chef_all ON register_sessions
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS order_queue_chef_all ON order_queue;
CREATE POLICY order_queue_chef_all ON order_queue
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- ─── Indexes ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_register_sessions_tenant_status
  ON register_sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_register_sessions_tenant_opened
  ON register_sessions(tenant_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_queue_tenant_status
  ON order_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_order_queue_sale
  ON order_queue(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_register_session
  ON sales(register_session_id) WHERE register_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_sale
  ON inventory_transactions(sale_id) WHERE sale_id IS NOT NULL;
