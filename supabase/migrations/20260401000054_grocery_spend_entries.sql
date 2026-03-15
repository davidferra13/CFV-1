-- Grocery Spend Entries: manual grocery cost tracking per event
-- Used by the food cost tracking system to compare estimated (recipe-based)
-- vs actual (grocery receipt) food costs per event.

CREATE TABLE IF NOT EXISTS grocery_spend_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  store_name      TEXT NOT NULL,
  amount_cents    INTEGER NOT NULL CHECK (amount_cents >= 0),
  purchase_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  receipt_url     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grocery_spend_tenant_event ON grocery_spend_entries(tenant_id, event_id);
CREATE INDEX IF NOT EXISTS idx_grocery_spend_event ON grocery_spend_entries(event_id);

-- RLS
ALTER TABLE grocery_spend_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grocery_spend_tenant_isolation" ON grocery_spend_entries
  FOR ALL USING (tenant_id = auth.uid());

-- updated_at trigger (reuse existing moddatetime if available)
DROP TRIGGER IF EXISTS set_grocery_spend_updated_at ON grocery_spend_entries;
CREATE TRIGGER set_grocery_spend_updated_at
  BEFORE UPDATE ON grocery_spend_entries
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
