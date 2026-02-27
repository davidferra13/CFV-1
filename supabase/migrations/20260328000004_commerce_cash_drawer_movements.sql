-- Commerce Engine Wave 2.5 - Cash Drawer Movements
-- Tracks every cash movement in real time per register session.

DO $$ BEGIN
  CREATE TYPE cash_drawer_movement_type AS ENUM (
    'sale_payment',
    'refund',
    'paid_in',
    'paid_out',
    'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cash_drawer_movements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  register_session_id UUID NOT NULL REFERENCES register_sessions(id) ON DELETE CASCADE,
  movement_type       cash_drawer_movement_type NOT NULL,
  amount_cents        INTEGER NOT NULL CHECK (amount_cents <> 0),
  notes               TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,

  commerce_payment_id UUID UNIQUE REFERENCES commerce_payments(id) ON DELETE SET NULL,
  commerce_refund_id  UUID UNIQUE REFERENCES commerce_refunds(id) ON DELETE SET NULL,

  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    (commerce_payment_id IS NOT NULL AND commerce_refund_id IS NULL) OR
    (commerce_payment_id IS NULL AND commerce_refund_id IS NOT NULL) OR
    (commerce_payment_id IS NULL AND commerce_refund_id IS NULL)
  ),

  CHECK (
    CASE movement_type
      WHEN 'sale_payment' THEN amount_cents > 0
      WHEN 'refund' THEN amount_cents < 0
      WHEN 'paid_in' THEN amount_cents > 0
      WHEN 'paid_out' THEN amount_cents < 0
      ELSE TRUE
    END
  )
);

DROP TRIGGER IF EXISTS update_cash_drawer_movements_updated_at ON cash_drawer_movements;
CREATE TRIGGER update_cash_drawer_movements_updated_at
  BEFORE UPDATE ON cash_drawer_movements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE cash_drawer_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_drawer_movements_chef_all ON cash_drawer_movements;
CREATE POLICY cash_drawer_movements_chef_all ON cash_drawer_movements
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

CREATE INDEX IF NOT EXISTS idx_cash_drawer_movements_tenant_session_created
  ON cash_drawer_movements(tenant_id, register_session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_drawer_movements_tenant_type
  ON cash_drawer_movements(tenant_id, movement_type, created_at DESC);

CREATE OR REPLACE FUNCTION create_cash_drawer_movement_from_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
  v_amount_cents INTEGER;
BEGIN
  IF NEW.payment_method <> 'cash' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('captured', 'settled') THEN
    RETURN NEW;
  END IF;

  IF NEW.sale_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT register_session_id
    INTO v_session_id
  FROM sales
  WHERE id = NEW.sale_id;

  IF v_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_amount_cents := NEW.amount_cents + COALESCE(NEW.tip_cents, 0);

  INSERT INTO cash_drawer_movements (
    tenant_id,
    register_session_id,
    movement_type,
    amount_cents,
    notes,
    metadata,
    commerce_payment_id,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    NEW.tenant_id,
    v_session_id,
    'sale_payment',
    v_amount_cents,
    COALESCE(NEW.notes, 'Cash payment recorded'),
    jsonb_build_object(
      'sale_id', NEW.sale_id,
      'payment_status', NEW.status
    ),
    NEW.id,
    NEW.created_by,
    COALESCE(NEW.captured_at, NEW.created_at, now()),
    now()
  )
  ON CONFLICT (commerce_payment_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS commerce_payment_to_cash_drawer ON commerce_payments;
CREATE TRIGGER commerce_payment_to_cash_drawer
  AFTER INSERT OR UPDATE OF status ON commerce_payments
  FOR EACH ROW EXECUTE FUNCTION create_cash_drawer_movement_from_payment();

CREATE OR REPLACE FUNCTION create_cash_drawer_movement_from_refund()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
  v_payment_method payment_method;
BEGIN
  IF NEW.status <> 'processed' THEN
    RETURN NEW;
  END IF;

  SELECT s.register_session_id, p.payment_method
    INTO v_session_id, v_payment_method
  FROM commerce_payments p
  LEFT JOIN sales s ON s.id = p.sale_id
  WHERE p.id = NEW.payment_id;

  IF v_payment_method <> 'cash' THEN
    RETURN NEW;
  END IF;

  IF v_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO cash_drawer_movements (
    tenant_id,
    register_session_id,
    movement_type,
    amount_cents,
    notes,
    metadata,
    commerce_refund_id,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    NEW.tenant_id,
    v_session_id,
    'refund',
    -1 * NEW.amount_cents,
    COALESCE(NEW.reason, 'Cash refund recorded'),
    jsonb_build_object(
      'payment_id', NEW.payment_id,
      'sale_id', NEW.sale_id
    ),
    NEW.id,
    NEW.created_by,
    COALESCE(NEW.processed_at, NEW.created_at, now()),
    now()
  )
  ON CONFLICT (commerce_refund_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS commerce_refund_to_cash_drawer ON commerce_refunds;
CREATE TRIGGER commerce_refund_to_cash_drawer
  AFTER INSERT OR UPDATE OF status ON commerce_refunds
  FOR EACH ROW EXECUTE FUNCTION create_cash_drawer_movement_from_refund();

-- Backfill historical payments/refunds for existing register sessions.
INSERT INTO cash_drawer_movements (
  tenant_id,
  register_session_id,
  movement_type,
  amount_cents,
  notes,
  metadata,
  commerce_payment_id,
  created_by,
  created_at,
  updated_at
)
SELECT
  p.tenant_id,
  s.register_session_id,
  'sale_payment',
  p.amount_cents + COALESCE(p.tip_cents, 0),
  COALESCE(p.notes, 'Backfill cash payment'),
  jsonb_build_object(
    'sale_id', p.sale_id,
    'payment_status', p.status,
    'backfilled', true
  ),
  p.id,
  p.created_by,
  COALESCE(p.captured_at, p.created_at, now()),
  now()
FROM commerce_payments p
JOIN sales s ON s.id = p.sale_id
WHERE p.payment_method = 'cash'
  AND p.status IN ('captured', 'settled')
  AND s.register_session_id IS NOT NULL
ON CONFLICT (commerce_payment_id) DO NOTHING;

INSERT INTO cash_drawer_movements (
  tenant_id,
  register_session_id,
  movement_type,
  amount_cents,
  notes,
  metadata,
  commerce_refund_id,
  created_by,
  created_at,
  updated_at
)
SELECT
  r.tenant_id,
  s.register_session_id,
  'refund',
  -1 * r.amount_cents,
  COALESCE(r.reason, 'Backfill cash refund'),
  jsonb_build_object(
    'payment_id', r.payment_id,
    'sale_id', r.sale_id,
    'backfilled', true
  ),
  r.id,
  r.created_by,
  COALESCE(r.processed_at, r.created_at, now()),
  now()
FROM commerce_refunds r
JOIN commerce_payments p ON p.id = r.payment_id
JOIN sales s ON s.id = p.sale_id
WHERE r.status = 'processed'
  AND p.payment_method = 'cash'
  AND s.register_session_id IS NOT NULL
ON CONFLICT (commerce_refund_id) DO NOTHING;

