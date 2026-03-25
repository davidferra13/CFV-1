-- V1 Close-Out Fixes
-- 1. Add dismissed_recall_ids column to chefs table (recall dismiss persistence)
-- 2. Create quote_selected_addons junction table (addon toggle persistence)

-- ─── 1. Recall Dismiss Persistence ──────────────────────────────────────────

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS dismissed_recall_ids TEXT[] DEFAULT '{}';

COMMENT ON COLUMN chefs.dismissed_recall_ids IS 'FDA recall IDs dismissed by this chef — prevents showing dismissed recalls again';

-- ─── 2. Quote ↔ Addon Selection ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quote_selected_addons (
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES proposal_addons(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  price_cents_snapshot INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (quote_id, addon_id)
);

CREATE INDEX IF NOT EXISTS idx_quote_selected_addons_quote ON quote_selected_addons(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_selected_addons_tenant ON quote_selected_addons(tenant_id);

-- RLS: chef can manage their own quote addons
ALTER TABLE quote_selected_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs manage their own quote addons" ON quote_selected_addons;
CREATE POLICY "Chefs manage their own quote addons"
  ON quote_selected_addons FOR ALL
  USING (
    tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
