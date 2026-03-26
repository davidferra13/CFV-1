-- Expense Line Items: links individual expense items to ingredients
-- Closes the cost loop: receipt line items → ingredients → actual cost tracking
--
-- This table bridges the gap between generic expenses (total amount per store)
-- and the ingredient-level costing system. When a receipt is approved, each
-- line item can be matched to an ingredient from the master list, enabling:
--   1. Actual vs estimated cost comparison per event
--   2. Automatic ingredient price updates from real purchases
--   3. Per-ingredient spend tracking over time

CREATE TABLE IF NOT EXISTS expense_line_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id        UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_id     UUID REFERENCES ingredients(id) ON DELETE SET NULL,  -- nullable for unmatched items
  receipt_line_item_id UUID REFERENCES receipt_line_items(id) ON DELETE SET NULL,  -- source traceability
  description       TEXT NOT NULL,
  quantity          DECIMAL,
  unit              TEXT,
  amount_cents      INTEGER NOT NULL CHECK (amount_cents >= 0),
  matched_by        TEXT NOT NULL DEFAULT 'manual' CHECK (matched_by IN ('manual', 'ai', 'receipt_ocr')),
  match_confidence  DECIMAL CHECK (match_confidence >= 0 AND match_confidence <= 1),
  price_applied     BOOLEAN NOT NULL DEFAULT false,  -- true once this price was used to update ingredient.last_price_cents
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eli_tenant_expense ON expense_line_items(tenant_id, expense_id);
CREATE INDEX IF NOT EXISTS idx_eli_ingredient ON expense_line_items(ingredient_id) WHERE ingredient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eli_expense ON expense_line_items(expense_id);

-- RLS
ALTER TABLE expense_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eli_tenant_isolation" ON expense_line_items;
CREATE POLICY "eli_tenant_isolation" ON expense_line_items
  FOR ALL USING (tenant_id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS set_eli_updated_at ON expense_line_items;
CREATE TRIGGER set_eli_updated_at
  BEFORE UPDATE ON expense_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
