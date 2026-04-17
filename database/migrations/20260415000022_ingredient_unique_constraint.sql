-- J2 fix: Add unique constraint on ingredients (tenant_id, lower(name))
-- Prevents duplicate ingredients per tenant from concurrent findOrCreateIngredient calls.
-- Uses lower() for case-insensitive dedup matching the app's ilike() lookup.

CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_tenant_name_unique
  ON ingredients(tenant_id, lower(name));
