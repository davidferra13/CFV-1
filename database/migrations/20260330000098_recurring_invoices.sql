-- Recurring Invoices: upgrade schedule table + add history table
-- Extends the existing recurring_invoices table with scheduling, autopay, and lifecycle columns.
-- Adds recurring_invoice_history for tracking each generated invoice instance.

-- ============================================
-- ALTER: RECURRING_INVOICES (schedule config)
-- ============================================

-- Human-readable name for the schedule (e.g. "Weekly Meal Prep")
ALTER TABLE recurring_invoices ADD COLUMN IF NOT EXISTS name TEXT;
-- Scheduling anchors
ALTER TABLE recurring_invoices ADD COLUMN IF NOT EXISTS day_of_week INTEGER CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6));
ALTER TABLE recurring_invoices ADD COLUMN IF NOT EXISTS day_of_month INTEGER CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 28));
ALTER TABLE recurring_invoices ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE recurring_invoices ADD COLUMN IF NOT EXISTS end_date DATE;
-- Autopay support
ALTER TABLE recurring_invoices ADD COLUMN IF NOT EXISTS is_autopay BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE recurring_invoices ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;
-- Status: active, paused, cancelled (is_active stays for backward compat, but add status for richer lifecycle)
ALTER TABLE recurring_invoices ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'paused', 'cancelled'));
COMMENT ON COLUMN recurring_invoices.name IS 'Human-readable label for this recurring billing schedule';
COMMENT ON COLUMN recurring_invoices.day_of_week IS '0=Sunday through 6=Saturday. Used for weekly/biweekly schedules';
COMMENT ON COLUMN recurring_invoices.day_of_month IS '1-28 for monthly schedules. Capped at 28 to avoid month-length issues';
COMMENT ON COLUMN recurring_invoices.is_autopay IS 'If true, automatically charges saved payment method on invoice date';
COMMENT ON COLUMN recurring_invoices.stripe_payment_method_id IS 'Saved Stripe PaymentMethod ID for autopay charges';
COMMENT ON COLUMN recurring_invoices.status IS 'Lifecycle status: active, paused, or cancelled';
-- ============================================
-- TABLE: RECURRING_INVOICE_HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_invoice_history (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id             UUID NOT NULL REFERENCES recurring_invoices(id) ON DELETE CASCADE,
  chef_id                 UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number          TEXT NOT NULL,
  amount_cents            INTEGER NOT NULL CHECK (amount_cents >= 0),
  period_start            DATE NOT NULL,
  period_end              DATE NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  paid_at                 TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  ledger_entry_id         UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rih_schedule ON recurring_invoice_history(schedule_id);
CREATE INDEX IF NOT EXISTS idx_rih_chef_status ON recurring_invoice_history(chef_id, status);
CREATE INDEX IF NOT EXISTS idx_rih_chef_created ON recurring_invoice_history(chef_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rih_client ON recurring_invoice_history(client_id, created_at DESC);
COMMENT ON TABLE recurring_invoice_history IS 'Individual invoice instances generated from recurring schedules. Each row = one billing period.';
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE recurring_invoice_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rih_chef_select ON recurring_invoice_history;
CREATE POLICY rih_chef_select ON recurring_invoice_history FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS rih_chef_insert ON recurring_invoice_history;
CREATE POLICY rih_chef_insert ON recurring_invoice_history FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS rih_chef_update ON recurring_invoice_history;
CREATE POLICY rih_chef_update ON recurring_invoice_history FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS rih_chef_delete ON recurring_invoice_history;
CREATE POLICY rih_chef_delete ON recurring_invoice_history FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
