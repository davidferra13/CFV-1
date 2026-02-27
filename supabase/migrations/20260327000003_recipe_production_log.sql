-- Recipe Production Log
-- Tracks every time a recipe is produced: who, when, how much, shelf life, notes.
-- One row per production run. Additive only.

CREATE TABLE recipe_production_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  recipe_id     UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,

  produced_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  produced_by   TEXT,                              -- name of person who made it
  quantity      DECIMAL(10,3) NOT NULL,            -- how much was made
  unit          TEXT NOT NULL DEFAULT 'servings',   -- servings, portions, quarts, etc.

  best_before   TIMESTAMPTZ,                       -- use-by / best-before date
  discard_at    TIMESTAMPTZ,                       -- hard throw-away date

  batch_notes   TEXT,                              -- any notes about this batch
  event_id      UUID REFERENCES events(id) ON DELETE SET NULL,  -- optional event link

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_prod_log_recipe ON recipe_production_log(recipe_id, produced_at DESC);
CREATE INDEX idx_prod_log_tenant ON recipe_production_log(tenant_id, produced_at DESC);
CREATE INDEX idx_prod_log_expiry ON recipe_production_log(tenant_id, discard_at)
  WHERE discard_at IS NOT NULL AND discard_at > now();

-- RLS
ALTER TABLE recipe_production_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef can manage own production logs"
  ON recipe_production_log
  FOR ALL
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE recipe_production_log IS 'Tracks every production run of a recipe — who made it, quantity, shelf life, notes';
