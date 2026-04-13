-- Partner Payout History
-- Tracks commissions paid out to referral partners.
-- Each row = one payout for one or more completed events.

CREATE TABLE IF NOT EXISTS partner_payouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  partner_id  UUID NOT NULL REFERENCES referral_partners(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  paid_on     DATE NOT NULL DEFAULT CURRENT_DATE,
  method      TEXT CHECK (method IN ('check', 'venmo', 'zelle', 'bank_transfer', 'cash', 'paypal', 'other')) DEFAULT 'other',
  reference   TEXT,          -- check number, transaction ID, etc.
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_payouts_tenant    ON partner_payouts (tenant_id);
CREATE INDEX idx_partner_payouts_partner   ON partner_payouts (partner_id);
CREATE INDEX idx_partner_payouts_paid_on   ON partner_payouts (paid_on DESC);

-- RLS
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY partner_payouts_select ON partner_payouts FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY partner_payouts_insert ON partner_payouts FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY partner_payouts_update ON partner_payouts FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY partner_payouts_delete ON partner_payouts FOR DELETE USING (tenant_id = get_current_tenant_id());
