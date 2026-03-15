-- Feature 3.12: Comprehensive expense tracking beyond food
-- Adds missing columns to existing expenses table (from Layer 3).
-- Original table uses tenant_id, not chef_id.

-- Add missing columns idempotently
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_interval TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tax_deductible BOOLEAN DEFAULT true;

-- Indexes (use tenant_id since that's what the original table has)
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON expenses(tenant_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category2 ON expenses(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_event ON expenses(event_id);

-- RLS policy using tenant_id (matching original table schema)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chef_own_expenses" ON expenses;
CREATE POLICY "chef_own_expenses" ON expenses FOR ALL USING (tenant_id = auth.uid());
