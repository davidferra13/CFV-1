-- Expense Tax Categories
-- Maps expenses to IRS Schedule C line items for tax preparation.
-- Complements existing expenses table and tax_quarterly_estimates.

-- ============================================
-- TABLE: EXPENSE TAX CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS expense_tax_categories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  expense_description TEXT NOT NULL,
  schedule_c_line     TEXT NOT NULL CHECK (schedule_c_line IN (
    'line_8', 'line_9', 'line_13', 'line_15', 'line_17', 'line_18',
    'line_22', 'line_24a', 'line_24b', 'line_25', 'line_27a',
    'cogs'
  )),
  amount_cents        INTEGER NOT NULL CHECK (amount_cents > 0),
  tax_year            INTEGER NOT NULL CHECK (tax_year >= 2020 AND tax_year <= 2035),
  quarter             INTEGER CHECK (quarter IS NULL OR quarter IN (1, 2, 3, 4)),
  source              TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('ledger', 'manual', 'mileage', 'expense')),
  source_id           UUID,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_etc_tenant_year ON expense_tax_categories(tenant_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_etc_schedule_line ON expense_tax_categories(tenant_id, schedule_c_line, tax_year);
CREATE INDEX IF NOT EXISTS idx_etc_source ON expense_tax_categories(source, source_id) WHERE source_id IS NOT NULL;

COMMENT ON TABLE expense_tax_categories IS 'Maps expenses to IRS Schedule C line items. Used by the Tax Preparation Helper for year-end filing.';
COMMENT ON COLUMN expense_tax_categories.schedule_c_line IS 'IRS Schedule C line reference (e.g. line_8 = Advertising, line_22 = Supplies).';
COMMENT ON COLUMN expense_tax_categories.source IS 'Where this categorization came from: ledger entry, manual input, mileage log, or expense record.';

DROP TRIGGER IF EXISTS trg_etc_updated_at ON expense_tax_categories;
CREATE TRIGGER trg_etc_updated_at
  BEFORE UPDATE ON expense_tax_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE expense_tax_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS etc_chef_select ON expense_tax_categories;
CREATE POLICY etc_chef_select ON expense_tax_categories FOR SELECT USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS etc_chef_insert ON expense_tax_categories;
CREATE POLICY etc_chef_insert ON expense_tax_categories FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS etc_chef_update ON expense_tax_categories;
CREATE POLICY etc_chef_update ON expense_tax_categories FOR UPDATE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS etc_chef_delete ON expense_tax_categories;
CREATE POLICY etc_chef_delete ON expense_tax_categories FOR DELETE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
