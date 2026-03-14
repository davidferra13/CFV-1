-- Financial Infrastructure: Bank Feed, Tax Estimates, Contractor Payments, Recurring Invoices, Disputes
-- Closes gaps identified in competitive analysis vs QuickBooks, Square

-- ============================================
-- TABLE 1: BANK CONNECTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS bank_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  provider              TEXT NOT NULL CHECK (provider IN ('plaid', 'stripe')),
  provider_account_id   TEXT NOT NULL,
  institution_name      TEXT NOT NULL,
  account_name          TEXT,
  account_type          TEXT NOT NULL DEFAULT 'checking'
                        CHECK (account_type IN ('checking', 'savings', 'credit_card', 'other')),
  is_active             BOOLEAN NOT NULL DEFAULT true,
  connected_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, provider_account_id)
);

CREATE INDEX idx_bank_connections_chef ON bank_connections(chef_id, is_active);

CREATE TRIGGER trg_bank_connections_updated_at
  BEFORE UPDATE ON bank_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: BANK TRANSACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS bank_transactions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  bank_connection_id        UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  provider_transaction_id   TEXT,
  amount_cents              INTEGER NOT NULL,
  date                      DATE NOT NULL,
  description               TEXT,
  vendor_name               TEXT,
  suggested_category        TEXT,
  confirmed_category        TEXT,
  matched_expense_id        UUID REFERENCES expenses(id) ON DELETE SET NULL,
  status                    TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'confirmed', 'ignored')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, provider_transaction_id)
);

CREATE INDEX idx_bank_transactions_chef_status ON bank_transactions(chef_id, status);
CREATE INDEX idx_bank_transactions_chef_date ON bank_transactions(chef_id, date DESC);

CREATE TRIGGER trg_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 3: TAX QUARTERLY ESTIMATES
-- ============================================

CREATE TABLE IF NOT EXISTS tax_quarterly_estimates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                 UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tax_year                INTEGER NOT NULL,
  quarter                 INTEGER NOT NULL CHECK (quarter IN (1, 2, 3, 4)),
  estimated_income_cents  INTEGER NOT NULL DEFAULT 0,
  estimated_se_tax_cents  INTEGER NOT NULL DEFAULT 0,
  estimated_federal_cents INTEGER NOT NULL DEFAULT 0,
  estimated_state_cents   INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents       INTEGER NOT NULL DEFAULT 0,
  due_date                DATE,
  paid_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, tax_year, quarter)
);

CREATE INDEX idx_tax_quarterly_chef_year ON tax_quarterly_estimates(chef_id, tax_year DESC);

CREATE TRIGGER trg_tax_quarterly_updated_at
  BEFORE UPDATE ON tax_quarterly_estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 4: CONTRACTOR PAYMENTS (1099 Tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS contractor_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  staff_member_id   UUID NOT NULL REFERENCES staff_members(id) ON DELETE RESTRICT,
  amount_cents      INTEGER NOT NULL CHECK (amount_cents >= 0),
  payment_date      DATE NOT NULL,
  payment_method    TEXT NOT NULL DEFAULT 'check'
                    CHECK (payment_method IN ('check', 'venmo', 'zelle', 'cash', 'direct_deposit', 'other')),
  description       TEXT,
  tax_year          INTEGER NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contractor_payments_chef_year ON contractor_payments(chef_id, tax_year);
CREATE INDEX idx_contractor_payments_staff ON contractor_payments(staff_member_id, tax_year);

-- ============================================
-- TABLE 5: RECURRING INVOICES
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  frequency         TEXT NOT NULL DEFAULT 'monthly'
                    CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
  amount_cents      INTEGER NOT NULL CHECK (amount_cents >= 0),
  description       TEXT,
  next_send_date    DATE,
  last_sent_at      TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  late_fee_cents    INTEGER NOT NULL DEFAULT 0,
  late_fee_days     INTEGER NOT NULL DEFAULT 30,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_invoices_chef ON recurring_invoices(chef_id, is_active);

CREATE TRIGGER trg_recurring_invoices_updated_at
  BEFORE UPDATE ON recurring_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 6: PAYMENT DISPUTES
-- ============================================

CREATE TABLE IF NOT EXISTS payment_disputes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES events(id) ON DELETE SET NULL,
  stripe_dispute_id TEXT,
  amount_cents      INTEGER NOT NULL,
  reason            TEXT,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'under_review', 'won', 'lost')),
  evidence_notes    TEXT,
  evidence_urls     JSONB NOT NULL DEFAULT '[]',
  opened_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_disputes_chef_status ON payment_disputes(chef_id, status);

CREATE TRIGGER trg_payment_disputes_updated_at
  BEFORE UPDATE ON payment_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE bank_connections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_quarterly_estimates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_disputes          ENABLE ROW LEVEL SECURITY;

-- bank_connections
CREATE POLICY bc_chef_select ON bank_connections FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY bc_chef_insert ON bank_connections FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY bc_chef_update ON bank_connections FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY bc_chef_delete ON bank_connections FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- bank_transactions
CREATE POLICY bt_chef_select ON bank_transactions FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY bt_chef_insert ON bank_transactions FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY bt_chef_update ON bank_transactions FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY bt_chef_delete ON bank_transactions FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- tax_quarterly_estimates
CREATE POLICY tqe_chef_select ON tax_quarterly_estimates FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY tqe_chef_insert ON tax_quarterly_estimates FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY tqe_chef_update ON tax_quarterly_estimates FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY tqe_chef_delete ON tax_quarterly_estimates FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- contractor_payments
CREATE POLICY cp_chef_select ON contractor_payments FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cp_chef_insert ON contractor_payments FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cp_chef_update ON contractor_payments FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cp_chef_delete ON contractor_payments FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- recurring_invoices
CREATE POLICY ri_chef_select ON recurring_invoices FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ri_chef_insert ON recurring_invoices FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ri_chef_update ON recurring_invoices FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ri_chef_delete ON recurring_invoices FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- payment_disputes
CREATE POLICY pd_chef_select ON payment_disputes FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pd_chef_insert ON payment_disputes FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pd_chef_update ON payment_disputes FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pd_chef_delete ON payment_disputes FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
