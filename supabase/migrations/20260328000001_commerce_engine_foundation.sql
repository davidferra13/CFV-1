-- ═══════════════════════════════════════════════════════════════════
-- Commerce Engine V1 — Foundation
-- Unified POS, Invoice, Event & Financial Operating Layer
--
-- This migration is additive only. No DROP, no DELETE, no destructive ops.
--
-- Key design decisions:
--   1. Sale is the universal revenue container. Optional event_id bridges
--      to the existing event pipeline. NULL event_id = standalone POS sale.
--   2. payments table = operational layer (processor details, settlement).
--      DB trigger auto-creates ledger_entries for client-linked payments,
--      preserving ledger as the financial source of truth.
--   3. product_projections = frozen snapshots of sellable items. Menu edits
--      after snapshot don't affect historical sales (immutability pattern).
--   4. Existing event_financial_summary view is NOT modified — it still
--      reads from ledger_entries and continues to work unchanged.
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════

CREATE TYPE sale_status AS ENUM (
  'draft',
  'pending_payment',
  'authorized',
  'captured',
  'settled',
  'partially_refunded',
  'fully_refunded',
  'voided'
);
CREATE TYPE sale_channel AS ENUM (
  'counter',          -- In-person POS
  'order_ahead',      -- Client placed order for pickup/delivery
  'invoice',          -- Event invoice / ticket
  'online',           -- Web storefront (future)
  'phone'             -- Phone order
);
CREATE TYPE commerce_payment_status AS ENUM (
  'pending',
  'authorized',
  'captured',
  'settled',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
  'disputed'
);
CREATE TYPE refund_status AS ENUM (
  'pending',
  'processed',
  'failed'
);
CREATE TYPE tax_class AS ENUM (
  'standard',         -- Default food tax rate
  'reduced',          -- Lower rate (some states for groceries)
  'exempt',           -- Tax exempt (catering in some jurisdictions)
  'alcohol',          -- Higher rate for alcohol
  'cannabis',         -- Cannabis tax where applicable
  'prepared_food',    -- Prepared food rate
  'zero'              -- Explicitly zero-rated
);
-- ═══════════════════════════════════════════════════════
-- TABLE: product_projections
-- Snapshot of a sellable item. Source: dish_index, dishes, or manual.
-- POS reads only this table during checkout — no recipe joins.
-- ═══════════════════════════════════════════════════════

CREATE TABLE product_projections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id),

  -- Source linkage (all optional — manual products have none)
  recipe_id       UUID REFERENCES recipes(id) ON DELETE SET NULL,
  menu_id         UUID REFERENCES menus(id) ON DELETE SET NULL,

  -- Product display
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT,                -- 'appetizer', 'entree', 'dessert', 'beverage', 'merchandise'
  sku             TEXT,                -- Optional SKU code
  barcode         TEXT,                -- Optional barcode (UPC/EAN)
  image_url       TEXT,

  -- Pricing (all in cents)
  price_cents     INTEGER NOT NULL CHECK (price_cents >= 0),
  cost_cents      INTEGER,             -- Snapshot of recipe cost at projection time
  tax_class       tax_class NOT NULL DEFAULT 'standard',

  -- Inventory
  track_inventory BOOLEAN NOT NULL DEFAULT false,
  available_qty   INTEGER,             -- NULL = unlimited, 0 = sold out
  low_stock_threshold INTEGER,

  -- Metadata
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  tags            TEXT[] DEFAULT '{}',
  modifiers       JSONB DEFAULT '[]',  -- [{name, options: [{label, price_delta_cents}]}]
  dietary_tags    TEXT[] DEFAULT '{}',
  allergen_flags  TEXT[] DEFAULT '{}',

  -- Snapshot metadata
  snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_version  INTEGER DEFAULT 1,   -- Increments on re-snapshot

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ═══════════════════════════════════════════════════════
-- TABLE: sales
-- Universal revenue container. One sale = one transaction.
-- Optional event_id bridges to existing event pipeline.
-- ═══════════════════════════════════════════════════════

CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id),

  -- Bridge to existing event system (NULL for standalone POS sales)
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Sale metadata
  sale_number     TEXT,                -- Auto-generated: SL-YYYY-NNNNN
  status          sale_status NOT NULL DEFAULT 'draft',
  channel         sale_channel NOT NULL DEFAULT 'counter',

  -- Register context (NULL for non-POS sales; FK added in Wave 2)
  register_session_id UUID,

  -- Financial totals (all in cents)
  subtotal_cents  INTEGER NOT NULL DEFAULT 0,
  discount_cents  INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  tax_cents       INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents     INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  tip_cents       INTEGER NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),

  -- Tax location
  tax_zip_code    TEXT,
  tax_rate        NUMERIC(8,6),        -- Combined rate at time of sale

  -- Currency (all tenants USD for now)
  currency        TEXT NOT NULL DEFAULT 'usd',

  -- Void tracking
  voided_at       TIMESTAMPTZ,
  voided_by       UUID REFERENCES auth.users(id),
  void_reason     TEXT,

  -- Metadata
  notes           TEXT,
  metadata        JSONB DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id)
);
-- ═══════════════════════════════════════════════════════
-- TABLE: sale_items
-- Line items on a sale. Snapshot of product at time of sale.
-- Immutable after payment.
-- ═══════════════════════════════════════════════════════

CREATE TABLE sale_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id               UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES chefs(id),

  -- Product snapshot (frozen at time of sale)
  product_projection_id UUID REFERENCES product_projections(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  description           TEXT,
  sku                   TEXT,
  category              TEXT,

  -- Pricing (all in cents)
  unit_price_cents      INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity              INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  discount_cents        INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  line_total_cents      INTEGER NOT NULL,    -- (unit_price * qty) - discount
  tax_class             tax_class NOT NULL DEFAULT 'standard',
  tax_cents             INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),

  -- Modifiers applied
  modifiers_applied     JSONB DEFAULT '[]',  -- [{name, option, price_delta_cents}]

  -- Cost tracking
  unit_cost_cents       INTEGER,             -- Snapshot from recipe_cost_summary

  -- Inventory linkage
  inventory_deducted    BOOLEAN NOT NULL DEFAULT false,

  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ═══════════════════════════════════════════════════════
-- TABLE: commerce_payments
-- Operational payment records with processor details.
-- Every captured/settled insert triggers a ledger entry
-- (only when client_id is available — anonymous POS sales
-- are tracked via sale_financial_summary view instead).
-- ═══════════════════════════════════════════════════════

CREATE TABLE commerce_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id),
  sale_id               UUID REFERENCES sales(id) ON DELETE SET NULL,
  event_id              UUID REFERENCES events(id) ON DELETE SET NULL,
  client_id             UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Payment details
  amount_cents          INTEGER NOT NULL CHECK (amount_cents > 0),
  tip_cents             INTEGER NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),
  payment_method        payment_method NOT NULL,
  status                commerce_payment_status NOT NULL DEFAULT 'pending',

  -- Processor details (Stripe, Square, etc.)
  processor_type        TEXT,                  -- 'stripe', 'square', 'manual'
  processor_reference_id TEXT,                 -- Stripe PaymentIntent ID, etc.

  -- Stripe-specific
  stripe_payment_intent_id TEXT,
  stripe_charge_id      TEXT,
  stripe_event_id       TEXT,

  -- Settlement tracking
  captured_at           TIMESTAMPTZ,
  settled_at            TIMESTAMPTZ,
  settlement_date       DATE,
  payout_batch_id       TEXT,

  -- Idempotency
  idempotency_key       TEXT NOT NULL,
  transaction_reference TEXT,

  -- Ledger bridge
  ledger_entry_id       UUID REFERENCES ledger_entries(id),

  -- Metadata
  metadata              JSONB DEFAULT '{}',
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES auth.users(id),

  -- Uniqueness constraints
  CONSTRAINT commerce_payments_idempotency UNIQUE (idempotency_key),
  CONSTRAINT commerce_payments_txn_ref UNIQUE (transaction_reference)
);
-- ═══════════════════════════════════════════════════════
-- TABLE: commerce_refunds
-- Tracks refunds against commerce_payments.
-- ═══════════════════════════════════════════════════════

CREATE TABLE commerce_refunds (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id),
  payment_id            UUID NOT NULL REFERENCES commerce_payments(id),
  sale_id               UUID REFERENCES sales(id) ON DELETE SET NULL,

  amount_cents          INTEGER NOT NULL CHECK (amount_cents > 0),
  reason                TEXT,
  status                refund_status NOT NULL DEFAULT 'pending',

  -- Stripe-specific
  stripe_refund_id      TEXT,

  -- Ledger bridge
  ledger_entry_id       UUID REFERENCES ledger_entries(id),

  -- Idempotency
  idempotency_key       TEXT NOT NULL,

  processed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES auth.users(id),

  CONSTRAINT commerce_refunds_idempotency UNIQUE (idempotency_key)
);
-- ═══════════════════════════════════════════════════════
-- TABLE: commerce_payment_schedules
-- Installment plans for events/large orders.
-- ═══════════════════════════════════════════════════════

CREATE TABLE commerce_payment_schedules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES chefs(id),
  sale_id             UUID REFERENCES sales(id) ON DELETE CASCADE,
  event_id            UUID REFERENCES events(id) ON DELETE CASCADE,

  installment_number  INTEGER NOT NULL,
  due_date            DATE NOT NULL,
  amount_cents        INTEGER NOT NULL CHECK (amount_cents > 0),
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  payment_id          UUID REFERENCES commerce_payments(id),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ═══════════════════════════════════════════════════════
-- SALE NUMBER GENERATOR
-- Format: SL-YYYY-NNNNN (sequential per tenant per year)
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  IF NEW.sale_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_year := EXTRACT(YEAR FROM COALESCE(NEW.created_at, NOW()))::TEXT;

  SELECT COUNT(*) + 1 INTO v_count
  FROM sales
  WHERE tenant_id = NEW.tenant_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM COALESCE(NEW.created_at, NOW()));

  NEW.sale_number := 'SL-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER generate_sale_number_trigger
  BEFORE INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION generate_sale_number();
-- ═══════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════

-- Product projections
CREATE INDEX idx_product_projections_tenant ON product_projections(tenant_id);
CREATE INDEX idx_product_projections_active ON product_projections(tenant_id, is_active)
  WHERE is_active = true;
CREATE INDEX idx_product_projections_sku ON product_projections(tenant_id, sku)
  WHERE sku IS NOT NULL;
CREATE INDEX idx_product_projections_category ON product_projections(tenant_id, category);
-- Sales
CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sales_event ON sales(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_sales_status ON sales(tenant_id, status);
CREATE INDEX idx_sales_channel ON sales(tenant_id, channel);
CREATE INDEX idx_sales_created ON sales(tenant_id, created_at DESC);
CREATE INDEX idx_sales_number ON sales(tenant_id, sale_number);
CREATE INDEX idx_sales_client ON sales(client_id) WHERE client_id IS NOT NULL;
-- Sale items
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_projection_id)
  WHERE product_projection_id IS NOT NULL;
-- Commerce payments
CREATE INDEX idx_commerce_payments_tenant ON commerce_payments(tenant_id);
CREATE INDEX idx_commerce_payments_sale ON commerce_payments(sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX idx_commerce_payments_event ON commerce_payments(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_commerce_payments_status ON commerce_payments(tenant_id, status);
CREATE INDEX idx_commerce_payments_stripe_pi ON commerce_payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX idx_commerce_payments_settlement ON commerce_payments(tenant_id, settlement_date)
  WHERE settlement_date IS NOT NULL;
-- Commerce refunds
CREATE INDEX idx_commerce_refunds_payment ON commerce_refunds(payment_id);
CREATE INDEX idx_commerce_refunds_sale ON commerce_refunds(sale_id) WHERE sale_id IS NOT NULL;
-- Payment schedules
CREATE INDEX idx_commerce_schedules_sale ON commerce_payment_schedules(sale_id)
  WHERE sale_id IS NOT NULL;
CREATE INDEX idx_commerce_schedules_event ON commerce_payment_schedules(event_id)
  WHERE event_id IS NOT NULL;
CREATE INDEX idx_commerce_schedules_due ON commerce_payment_schedules(tenant_id, due_date, status);
-- ═══════════════════════════════════════════════════════
-- TRIGGERS — updated_at
-- ═══════════════════════════════════════════════════════

CREATE TRIGGER update_product_projections_updated_at
  BEFORE UPDATE ON product_projections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commerce_payments_updated_at
  BEFORE UPDATE ON commerce_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commerce_schedules_updated_at
  BEFORE UPDATE ON commerce_payment_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ═══════════════════════════════════════════════════════
-- TRIGGER: Commerce Payment → Ledger Entry Bridge
-- Only fires for captured/settled payments that have a client_id.
-- Anonymous POS sales (no client) are tracked via sale_financial_summary.
-- This preserves the existing event financial pipeline.
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_ledger_entry_from_commerce_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  -- Only create ledger entry for captured/settled payments with a client
  IF NEW.status NOT IN ('captured', 'settled') THEN
    RETURN NEW;
  END IF;

  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if this payment already has a ledger entry (idempotency)
  IF NEW.ledger_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO ledger_entries (
    tenant_id, client_id, entry_type, amount_cents,
    payment_method, description, event_id,
    transaction_reference, created_by
  ) VALUES (
    NEW.tenant_id,
    NEW.client_id,
    'payment',
    NEW.amount_cents,
    NEW.payment_method,
    COALESCE(NEW.notes, 'Payment via Commerce Engine'),
    NEW.event_id,
    NEW.transaction_reference,
    NEW.created_by
  )
  RETURNING id INTO v_ledger_id;

  -- Back-link the ledger entry
  NEW.ledger_entry_id := v_ledger_id;

  -- If there's a tip, create a separate ledger entry for it
  IF NEW.tip_cents > 0 THEN
    INSERT INTO ledger_entries (
      tenant_id, client_id, entry_type, amount_cents,
      payment_method, description, event_id,
      transaction_reference, created_by
    ) VALUES (
      NEW.tenant_id,
      NEW.client_id,
      'tip',
      NEW.tip_cents,
      NEW.payment_method,
      'Tip via Commerce Engine',
      NEW.event_id,
      CASE WHEN NEW.transaction_reference IS NOT NULL
        THEN NEW.transaction_reference || '_tip'
        ELSE NULL
      END,
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER commerce_payment_to_ledger
  BEFORE INSERT ON commerce_payments
  FOR EACH ROW EXECUTE FUNCTION create_ledger_entry_from_commerce_payment();
-- ═══════════════════════════════════════════════════════
-- TRIGGER: Commerce Refund → Ledger Entry Bridge
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_ledger_entry_from_commerce_refund()
RETURNS TRIGGER AS $$
DECLARE
  v_payment RECORD;
  v_ledger_id UUID;
BEGIN
  IF NEW.status != 'processed' THEN
    RETURN NEW;
  END IF;

  -- Look up the original payment for context
  SELECT * INTO v_payment FROM commerce_payments WHERE id = NEW.payment_id;

  -- Only create ledger entry if the original payment has a client
  IF v_payment.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO ledger_entries (
    tenant_id, client_id, entry_type, amount_cents,
    payment_method, description, event_id,
    is_refund, refund_reason,
    transaction_reference, created_by
  ) VALUES (
    NEW.tenant_id,
    v_payment.client_id,
    'refund',
    -1 * NEW.amount_cents,   -- Refunds are negative in the ledger
    v_payment.payment_method,
    COALESCE(NEW.reason, 'Refund via Commerce Engine'),
    v_payment.event_id,
    true,
    NEW.reason,
    'refund_' || NEW.id::TEXT,
    NEW.created_by
  )
  RETURNING id INTO v_ledger_id;

  NEW.ledger_entry_id := v_ledger_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER commerce_refund_to_ledger
  BEFORE INSERT ON commerce_refunds
  FOR EACH ROW EXECUTE FUNCTION create_ledger_entry_from_commerce_refund();
-- ═══════════════════════════════════════════════════════
-- SALE STATUS TRANSITION GUARD
-- Prevents illegal status transitions.
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION guard_sale_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define allowed transitions
  CASE OLD.status
    WHEN 'draft' THEN
      IF NEW.status NOT IN ('pending_payment', 'voided') THEN
        RAISE EXCEPTION 'Cannot transition sale from draft to %', NEW.status;
      END IF;
    WHEN 'pending_payment' THEN
      IF NEW.status NOT IN ('authorized', 'captured', 'voided') THEN
        RAISE EXCEPTION 'Cannot transition sale from pending_payment to %', NEW.status;
      END IF;
    WHEN 'authorized' THEN
      IF NEW.status NOT IN ('captured', 'voided') THEN
        RAISE EXCEPTION 'Cannot transition sale from authorized to %', NEW.status;
      END IF;
    WHEN 'captured' THEN
      IF NEW.status NOT IN ('settled', 'partially_refunded', 'fully_refunded', 'voided') THEN
        RAISE EXCEPTION 'Cannot transition sale from captured to %', NEW.status;
      END IF;
    WHEN 'settled' THEN
      IF NEW.status NOT IN ('partially_refunded', 'fully_refunded') THEN
        RAISE EXCEPTION 'Cannot transition sale from settled to %', NEW.status;
      END IF;
    WHEN 'partially_refunded' THEN
      IF NEW.status NOT IN ('fully_refunded') THEN
        RAISE EXCEPTION 'Cannot transition sale from partially_refunded to %', NEW.status;
      END IF;
    WHEN 'fully_refunded' THEN
      RAISE EXCEPTION 'Cannot transition sale from fully_refunded (terminal state)';
    WHEN 'voided' THEN
      RAISE EXCEPTION 'Cannot transition sale from voided (terminal state)';
    ELSE
      RAISE EXCEPTION 'Unknown sale status: %', OLD.status;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER guard_sale_status
  BEFORE UPDATE OF status ON sales
  FOR EACH ROW EXECUTE FUNCTION guard_sale_status_transition();
-- ═══════════════════════════════════════════════════════
-- VIEW: sale_financial_summary
-- Per-sale financial totals derived from commerce_payments/refunds.
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE VIEW sale_financial_summary AS
SELECT
  s.id AS sale_id,
  s.tenant_id,
  s.sale_number,
  s.status,
  s.channel,
  s.total_cents,
  s.tax_cents,
  s.tip_cents,
  s.discount_cents,
  s.subtotal_cents,
  COALESCE(pay.total_paid_cents, 0) AS total_paid_cents,
  COALESCE(pay.total_tips_cents, 0) AS total_tips_cents,
  COALESCE(ref.total_refunded_cents, 0) AS total_refunded_cents,
  s.total_cents - COALESCE(pay.total_paid_cents, 0) + COALESCE(ref.total_refunded_cents, 0)
    AS balance_due_cents,
  COALESCE(cost.total_cost_cents, 0) AS total_cost_cents,
  s.total_cents - COALESCE(cost.total_cost_cents, 0) AS gross_profit_cents,
  s.created_at,
  s.event_id,
  s.client_id
FROM sales s
LEFT JOIN LATERAL (
  SELECT
    SUM(amount_cents) FILTER (WHERE status IN ('captured', 'settled')) AS total_paid_cents,
    SUM(tip_cents) FILTER (WHERE status IN ('captured', 'settled')) AS total_tips_cents
  FROM commerce_payments
  WHERE sale_id = s.id
) pay ON true
LEFT JOIN LATERAL (
  SELECT SUM(amount_cents) FILTER (WHERE status = 'processed') AS total_refunded_cents
  FROM commerce_refunds
  WHERE sale_id = s.id
) ref ON true
LEFT JOIN LATERAL (
  SELECT SUM(unit_cost_cents * quantity) AS total_cost_cents
  FROM sale_items
  WHERE sale_id = s.id AND unit_cost_cents IS NOT NULL
) cost ON true;
-- ═══════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════

ALTER TABLE product_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_payment_schedules ENABLE ROW LEVEL SECURITY;
-- Chef policies (full CRUD for tenant's data)
CREATE POLICY "chef_product_projections" ON product_projections
  FOR ALL USING (
    tenant_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef')
  );
CREATE POLICY "chef_sales" ON sales
  FOR ALL USING (
    tenant_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef')
  );
CREATE POLICY "chef_sale_items" ON sale_items
  FOR ALL USING (
    tenant_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef')
  );
CREATE POLICY "chef_commerce_payments" ON commerce_payments
  FOR ALL USING (
    tenant_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef')
  );
CREATE POLICY "chef_commerce_refunds" ON commerce_refunds
  FOR ALL USING (
    tenant_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef')
  );
CREATE POLICY "chef_commerce_schedules" ON commerce_payment_schedules
  FOR ALL USING (
    tenant_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef')
  );
-- Client policies (read own sales and payments)
CREATE POLICY "client_sales_read" ON sales
  FOR SELECT USING (
    client_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client')
  );
CREATE POLICY "client_commerce_payments_read" ON commerce_payments
  FOR SELECT USING (
    client_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client')
  );
-- Service role policies (for webhooks/background jobs)
CREATE POLICY "service_product_projections" ON product_projections
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_sales" ON sales
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_sale_items" ON sale_items
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_commerce_payments" ON commerce_payments
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_commerce_refunds" ON commerce_refunds
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_commerce_schedules" ON commerce_payment_schedules
  FOR ALL USING (auth.role() = 'service_role');
-- ═══════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════

COMMENT ON TABLE product_projections IS 'Sellable item snapshots. POS reads only this table during checkout.';
COMMENT ON TABLE sales IS 'Universal revenue container. Bridges to events via optional event_id.';
COMMENT ON TABLE sale_items IS 'Line items on a sale. Frozen snapshot of product at time of sale.';
COMMENT ON TABLE commerce_payments IS 'Operational payment records with processor details. Auto-creates ledger entries.';
COMMENT ON TABLE commerce_refunds IS 'Refund records against commerce_payments. Auto-creates ledger entries.';
COMMENT ON TABLE commerce_payment_schedules IS 'Installment plans for events and large orders.';
COMMENT ON VIEW sale_financial_summary IS 'Per-sale financial summary derived from commerce_payments and commerce_refunds.';
