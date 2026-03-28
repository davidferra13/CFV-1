-- Links a chef's ingredient to a canonical system ingredient for price matching.
-- Once confirmed by the chef, this link drives automatic price resolution
-- and copies density/yield data for unit conversion.

CREATE TABLE IF NOT EXISTS ingredient_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  -- NULL system_ingredient_id = "dismissed" (chef said none of these, don't ask again)
  -- SET NULL (not CASCADE): if a system_ingredient is deleted during re-seed, the alias
  -- row survives. The UI detects orphaned aliases (non-null confirmed_at but null
  -- system_ingredient_id with match_method != 'dismissed') and prompts the chef to re-match.
  system_ingredient_id UUID REFERENCES system_ingredients(id) ON DELETE SET NULL,
  match_method TEXT NOT NULL DEFAULT 'manual'
    CHECK (match_method IN ('manual', 'trigram', 'exact', 'dismissed')),
  similarity_score DECIMAL(4,3),  -- 0.000 to 1.000, null for manual/dismissed
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Nullable: null when confirmed via batch operation or programmatic match.
  confirmed_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ingredient_id)  -- one canonical match per chef ingredient
);

CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_tenant ON ingredient_aliases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_system ON ingredient_aliases(system_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_unmatched
  ON ingredient_aliases(tenant_id)
  WHERE system_ingredient_id IS NULL;  -- fast lookup for dismissed items
