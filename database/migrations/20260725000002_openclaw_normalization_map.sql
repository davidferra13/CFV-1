-- openclaw.normalization_map: raw scraped product name -> canonical ingredient.
--
-- The table was lost in the standalone-Postgres move: no migration ever created it,
-- but lib/openclaw/catalog-actions.ts, lib/ingredients/image-actions.ts and several
-- PIE views query it, so those paths fail at runtime. Shape is taken verbatim from
-- the Drizzle introspection artifact in lib/db/migrations/schema.ts
-- (normalizationMapInOpenclaw), which was generated from a database that had it.
--
-- canonical_ingredient_id is intentionally unconstrained, matching the introspected
-- shape: mappings get written during scraping before the canonical ingredient row
-- necessarily exists.

CREATE SCHEMA IF NOT EXISTS openclaw;

CREATE TABLE IF NOT EXISTS openclaw.normalization_map (
  raw_name TEXT PRIMARY KEY,
  canonical_ingredient_id TEXT NOT NULL,
  variant_id TEXT,
  method TEXT,
  confidence NUMERIC(3, 2),
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oc_norm_canonical
  ON openclaw.normalization_map (canonical_ingredient_id);

-- Lookups normalise case and whitespace before matching a scraped product name.
CREATE INDEX IF NOT EXISTS idx_oc_norm_raw_name_lower_trim
  ON openclaw.normalization_map (lower(TRIM(BOTH FROM raw_name)));
