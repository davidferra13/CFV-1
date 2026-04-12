-- =====================================================================================
-- INGREDIENT KNOWLEDGE LAYER
-- Wikidata + Wikipedia enrichment for system_ingredients
--
-- Architecture:
--   system_ingredients (anchor) -> ingredient_knowledge (rich content)
--
-- Enrichment source: Wikidata SPARQL (structured) + Wikipedia API (prose)
-- Populated by: scripts/openclaw-wiki-enrichment.mjs (Pi cron + local)
-- Public surface: /ingredient/[id] page
-- =====================================================================================

-- ---------------------------------------------------------------------------
-- 1. Pointer columns on system_ingredients (lightweight, no join needed)
-- ---------------------------------------------------------------------------

ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS wikidata_qid       TEXT,
  ADD COLUMN IF NOT EXISTS wikipedia_slug     TEXT,
  ADD COLUMN IF NOT EXISTS knowledge_enriched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_system_ingredients_wikidata_qid
  ON system_ingredients (wikidata_qid)
  WHERE wikidata_qid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_system_ingredients_wikipedia_slug
  ON system_ingredients (wikipedia_slug)
  WHERE wikipedia_slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. ingredient_knowledge - rich encyclopedic content per system ingredient
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ingredient_knowledge (
  id                    BIGSERIAL PRIMARY KEY,
  system_ingredient_id  UUID NOT NULL REFERENCES system_ingredients(id) ON DELETE CASCADE,

  -- External identifiers
  wikidata_qid          TEXT,                        -- e.g. "Q11004" (artichoke)
  wikipedia_slug        TEXT,                        -- e.g. "Artichoke" (article title)
  wikipedia_url         TEXT,                        -- full URL for attribution

  -- Descriptions (from Wikipedia API)
  wiki_summary          TEXT,                        -- 1-2 sentence summary
  wiki_extract          TEXT,                        -- full first-section prose extract

  -- Culinary knowledge (parsed from Wikipedia prose + Wikidata properties)
  origin_countries      TEXT[]  NOT NULL DEFAULT '{}',  -- ['Italy', 'Mediterranean']
  flavor_profile        TEXT,                        -- "earthy, slightly bitter, nutty"
  culinary_uses         TEXT,                        -- "roasted, braised, raw in salads"
  typical_pairings      TEXT[]  NOT NULL DEFAULT '{}',  -- ['lemon', 'garlic', 'olive oil']

  -- Taxonomy (from Wikidata)
  botanical_family      TEXT,                        -- "Asteraceae"
  taxon_name            TEXT,                        -- "Cynara cardunculus var. scolymus"

  -- Dietary / safety context
  dietary_flags         TEXT[]  NOT NULL DEFAULT '{}',  -- ['vegan', 'gluten-free', 'kosher']
  allergen_notes        TEXT,                        -- extra context beyond allergen_tags

  -- Enrichment metadata
  enrichment_source     TEXT    NOT NULL DEFAULT 'wikidata'
                          CHECK (enrichment_source IN ('wikidata', 'wikipedia', 'manual', 'partial')),
  enrichment_confidence NUMERIC(3,2)                 -- 0.00 - 1.00
                          CHECK (enrichment_confidence BETWEEN 0 AND 1),
  enriched_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  needs_review          BOOLEAN     NOT NULL DEFAULT FALSE,

  UNIQUE (system_ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_ingredient_knowledge_qid
  ON ingredient_knowledge (wikidata_qid)
  WHERE wikidata_qid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ingredient_knowledge_slug
  ON ingredient_knowledge (wikipedia_slug)
  WHERE wikipedia_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ingredient_knowledge_review
  ON ingredient_knowledge (needs_review)
  WHERE needs_review = TRUE;

-- RLS: public read (ingredient cards are public), no write for users
ALTER TABLE ingredient_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingredient_knowledge_read_all" ON ingredient_knowledge;
CREATE POLICY "ingredient_knowledge_read_all"
  ON ingredient_knowledge FOR SELECT
  USING (true);

GRANT SELECT ON ingredient_knowledge TO authenticated;
GRANT SELECT ON ingredient_knowledge TO anon;

-- ---------------------------------------------------------------------------
-- 3. ingredient_knowledge_slugs - alternate name index for slug-based lookup
--    Allows /ingredient/artichoke as well as /ingredient/{uuid}
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ingredient_knowledge_slugs (
  slug                  TEXT PRIMARY KEY,            -- url-safe lowercase: "globe-artichoke"
  system_ingredient_id  UUID NOT NULL REFERENCES system_ingredients(id) ON DELETE CASCADE,
  is_canonical          BOOLEAN NOT NULL DEFAULT FALSE  -- only one slug per ingredient is canonical
);

CREATE INDEX IF NOT EXISTS idx_ingredient_knowledge_slugs_si
  ON ingredient_knowledge_slugs (system_ingredient_id);

ALTER TABLE ingredient_knowledge_slugs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingredient_slugs_read_all" ON ingredient_knowledge_slugs;
CREATE POLICY "ingredient_slugs_read_all"
  ON ingredient_knowledge_slugs FOR SELECT
  USING (true);

GRANT SELECT ON ingredient_knowledge_slugs TO authenticated;
GRANT SELECT ON ingredient_knowledge_slugs TO anon;
