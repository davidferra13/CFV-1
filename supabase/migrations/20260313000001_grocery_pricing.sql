-- Migration: grocery_price_quotes + grocery_price_quote_items
-- Additive only — two new tables, no existing tables modified.
-- Stores the results of automated grocery pricing runs (Spoonacular + Kroger)
-- and the Instacart cart link generated for each event.

-- ─── grocery_price_quotes ─────────────────────────────────────────────────────
-- One record per pricing run for an event. Stores totals and the Instacart link.

CREATE TABLE grocery_price_quotes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id                 UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingredient_count         INT,
  spoonacular_total_cents  INT,
  kroger_total_cents       INT,
  average_total_cents      INT,
  instacart_link           TEXT,
  status                   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'complete', 'partial', 'failed'))
);

CREATE INDEX grocery_price_quotes_event_idx
  ON grocery_price_quotes (tenant_id, event_id, created_at DESC);

-- RLS
ALTER TABLE grocery_price_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_own_quotes"
  ON grocery_price_quotes
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid()
        AND role = 'chef'
    )
  );

-- ─── grocery_price_quote_items ────────────────────────────────────────────────
-- Per-ingredient line items from a pricing run.
-- Stores both API results and the computed average.

CREATE TABLE grocery_price_quote_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id                UUID NOT NULL REFERENCES grocery_price_quotes(id) ON DELETE CASCADE,
  ingredient_id           UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name         TEXT NOT NULL,
  quantity                DECIMAL,
  unit                    TEXT,
  spoonacular_price_cents INT,
  kroger_price_cents      INT,
  average_price_cents     INT
);

CREATE INDEX grocery_price_quote_items_quote_idx
  ON grocery_price_quote_items (quote_id);

-- RLS — accessible via quote's tenant_id
ALTER TABLE grocery_price_quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_own_quote_items"
  ON grocery_price_quote_items
  FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM grocery_price_quotes
      WHERE tenant_id IN (
        SELECT entity_id FROM user_roles
        WHERE auth_user_id = auth.uid()
          AND role = 'chef'
      )
    )
  );
