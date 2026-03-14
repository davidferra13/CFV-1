-- =====================================================================================
-- VOUCHERS + GIFT CARDS
-- =====================================================================================
-- Migration: 20260224000015_vouchers_and_gift_cards.sql
-- Description: Tenant-scoped voucher and gift card issuance with chef/client creation,
--              and chef-only delivery logging for sending to any recipient.
-- Dependencies: Layer 1 (user_roles + role helper functions), loyalty foundations
-- Date: February 24, 2026
-- =====================================================================================

-- =====================================================================================
-- ENUMS
-- =====================================================================================

DO $$ BEGIN
  CREATE TYPE incentive_type AS ENUM (
    'voucher',
    'gift_card'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE incentive_delivery_channel AS ENUM (
    'email',
    'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================================
-- TABLE 1: client_incentives
-- =====================================================================================

CREATE TABLE IF NOT EXISTS client_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  type incentive_type NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  amount_cents INTEGER,
  discount_percent INTEGER,
  expires_at TIMESTAMPTZ,
  max_redemptions INTEGER NOT NULL DEFAULT 1,
  redemptions_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  target_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_by_role user_role NOT NULL,
  created_by_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_client_incentives_tenant_code UNIQUE (tenant_id, code),
  CONSTRAINT chk_client_incentives_code_length CHECK (char_length(code) BETWEEN 4 AND 32),
  CONSTRAINT chk_client_incentives_title_not_blank CHECK (char_length(trim(title)) > 0),
  CONSTRAINT chk_client_incentives_value_shape CHECK (
    (
      type = 'gift_card'
      AND amount_cents > 0
      AND discount_percent IS NULL
    )
    OR
    (
      type = 'voucher'
      AND (
        (amount_cents > 0 AND discount_percent IS NULL)
        OR
        (discount_percent BETWEEN 1 AND 100 AND amount_cents IS NULL)
      )
    )
  ),
  CONSTRAINT chk_client_incentives_redemption_bounds CHECK (
    max_redemptions > 0
    AND redemptions_used >= 0
    AND redemptions_used <= max_redemptions
  ),
  CONSTRAINT chk_client_incentives_creator_role_shape CHECK (
    (created_by_role = 'chef' AND created_by_client_id IS NULL)
    OR
    (created_by_role = 'client' AND created_by_client_id IS NOT NULL)
  )
);

COMMENT ON TABLE client_incentives IS 'Voucher and gift card records. Can be created by chefs and clients within tenant rules.';
COMMENT ON COLUMN client_incentives.code IS 'Human-facing share code for voucher or gift card.';
COMMENT ON COLUMN client_incentives.target_client_id IS 'Optional intended recipient client in the same tenant.';

-- =====================================================================================
-- TABLE 2: incentive_deliveries
-- =====================================================================================

CREATE TABLE IF NOT EXISTS incentive_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incentive_id UUID NOT NULL REFERENCES client_incentives(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  sent_by_user_id UUID NOT NULL REFERENCES auth.users(id),

  recipient_name TEXT,
  recipient_email TEXT NOT NULL,
  message TEXT,
  delivery_channel incentive_delivery_channel NOT NULL DEFAULT 'email',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_incentive_deliveries_recipient_email CHECK (
    position('@' in recipient_email) > 1
  )
);

COMMENT ON TABLE incentive_deliveries IS 'Audit trail of voucher/gift card sends. Chef-only insert/select.';

-- =====================================================================================
-- INDEXES
-- =====================================================================================

CREATE INDEX IF NOT EXISTS idx_client_incentives_tenant ON client_incentives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_incentives_type ON client_incentives(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_client_incentives_target_client ON client_incentives(target_client_id) WHERE target_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_incentives_created_by_client ON client_incentives(created_by_client_id) WHERE created_by_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_incentives_active ON client_incentives(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_client_incentives_expires_at ON client_incentives(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incentive_deliveries_tenant ON incentive_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incentive_deliveries_incentive ON incentive_deliveries(incentive_id);
CREATE INDEX IF NOT EXISTS idx_incentive_deliveries_sent_at ON incentive_deliveries(sent_at DESC);

-- =====================================================================================
-- RLS: client_incentives
-- =====================================================================================

ALTER TABLE client_incentives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_incentives_chef_select ON client_incentives;
CREATE POLICY client_incentives_chef_select ON client_incentives
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS client_incentives_chef_insert ON client_incentives;
CREATE POLICY client_incentives_chef_insert ON client_incentives
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND created_by_role = 'chef'
    AND created_by_client_id IS NULL
    AND created_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS client_incentives_chef_update ON client_incentives;
CREATE POLICY client_incentives_chef_update ON client_incentives
  FOR UPDATE USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS client_incentives_chef_delete ON client_incentives;
CREATE POLICY client_incentives_chef_delete ON client_incentives
  FOR DELETE USING (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS client_incentives_client_select ON client_incentives;
CREATE POLICY client_incentives_client_select ON client_incentives
  FOR SELECT USING (
    get_current_user_role() = 'client'
    AND (
      created_by_client_id = get_current_client_id()
      OR target_client_id = get_current_client_id()
    )
  );

DROP POLICY IF EXISTS client_incentives_client_insert ON client_incentives;
CREATE POLICY client_incentives_client_insert ON client_incentives
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'client'
    AND created_by_role = 'client'
    AND created_by_client_id = get_current_client_id()
    AND created_by_user_id = auth.uid()
    AND tenant_id = (
      SELECT tenant_id FROM clients
      WHERE id = get_current_client_id()
    )
    AND (
      target_client_id IS NULL
      OR target_client_id = get_current_client_id()
    )
  );

-- =====================================================================================
-- RLS: incentive_deliveries
-- =====================================================================================

ALTER TABLE incentive_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS incentive_deliveries_chef_select ON incentive_deliveries;
CREATE POLICY incentive_deliveries_chef_select ON incentive_deliveries
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS incentive_deliveries_chef_insert ON incentive_deliveries;
CREATE POLICY incentive_deliveries_chef_insert ON incentive_deliveries
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND sent_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM client_incentives ci
      WHERE ci.id = incentive_id
        AND ci.tenant_id = get_current_tenant_id()
    )
  );

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

DROP TRIGGER IF EXISTS set_client_incentives_updated_at ON client_incentives;
CREATE TRIGGER set_client_incentives_updated_at
  BEFORE UPDATE ON client_incentives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- END
-- =====================================================================================
