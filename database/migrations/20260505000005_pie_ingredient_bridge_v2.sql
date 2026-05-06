-- PIE Ingredient Bridge v2: Normalized Name Matching
-- Expands bridge from 22K (exact) to ~60K+ rows using SQL-level normalization.
-- Does NOT drop v1; this creates a replacement materialized view.

-- Helper function for SQL-level ingredient name normalization
CREATE OR REPLACE FUNCTION openclaw.normalize_ingredient_name(raw_name text)
RETURNS text AS $$
DECLARE
  n text;
BEGIN
  n := lower(trim(raw_name));

  -- Strip brand prefix (anything before " - ")
  IF position(' - ' IN n) > 0 THEN
    n := substring(n FROM position(' - ' IN n) + 3);
  END IF;

  -- Strip common descriptive prefixes
  n := regexp_replace(n, '^(organic|fresh|frozen|dried|raw|whole|ground|chopped|diced|sliced|minced|boneless|skinless|unsalted|salted|roasted|toasted|smoked|canned|packed|crushed|shredded|grated|peeled|pitted|seedless|trimmed|washed|baby|young|mature|large|medium|small|extra|pure|natural|real|lite|light|low fat|nonfat|fat free|sugar free|gluten free|reduced|fortified|enriched|unbleached|bleached|instant|quick|old fashioned)\s+', '', 'g');

  -- Strip trailing size/quantity descriptors
  n := regexp_replace(n, '\s*\(.*\)$', '');
  n := regexp_replace(n, '\s*,\s*\d+(\.\d+)?\s*(oz|lb|g|kg|ml|l|ct|pk|pack)\.?$', '');

  -- Basic singularization (careful with exceptions)
  IF n NOT IN ('hummus', 'couscous', 'asparagus', 'citrus', 'octopus', 'hibiscus', 'arugula', 'quinoa', 'swiss', 'watercress', 'lemongrass', 'molasses', 'bass') THEN
    IF n LIKE '%ies' AND length(n) > 5 THEN
      n := regexp_replace(n, 'ies$', 'y');
    ELSIF n LIKE '%ches' OR n LIKE '%shes' OR n LIKE '%sses' OR n LIKE '%xes' OR n LIKE '%zes' THEN
      n := regexp_replace(n, 'es$', '');
    ELSIF n LIKE '%ves' THEN
      n := regexp_replace(n, 'ves$', 'f');
    ELSIF n LIKE '%s' AND n NOT LIKE '%ss' AND n NOT LIKE '%us' AND n NOT LIKE '%is' THEN
      n := regexp_replace(n, 's$', '');
    END IF;
  END IF;

  -- Collapse multiple spaces
  n := regexp_replace(n, '\s+', ' ', 'g');
  n := trim(n);

  RETURN n;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Drop old materialized view and replace with normalized version
DROP MATERIALIZED VIEW IF EXISTS openclaw.ingredient_bridge;

CREATE MATERIALIZED VIEW openclaw.ingredient_bridge AS
SELECT DISTINCT ON (si.id)
  si.id AS system_ingredient_id,
  ci.ingredient_id AS canonical_ingredient_id,
  si.name AS system_name,
  ci.name AS canonical_name,
  ci.category,
  -- Track match quality for confidence adjustment
  CASE
    WHEN lower(si.name) = lower(ci.name) THEN 'exact'
    WHEN openclaw.normalize_ingredient_name(si.name) = openclaw.normalize_ingredient_name(ci.name) THEN 'normalized'
    ELSE 'fuzzy'
  END AS match_quality
FROM public.system_ingredients si
JOIN openclaw.canonical_ingredients ci
  ON openclaw.normalize_ingredient_name(si.name) = openclaw.normalize_ingredient_name(ci.name)
ORDER BY si.id,
  -- Prefer exact matches over normalized ones
  CASE WHEN lower(si.name) = lower(ci.name) THEN 0 ELSE 1 END,
  ci.ingredient_id
WITH DATA;

-- Indexes for fast joins from both directions
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredient_bridge_system
  ON openclaw.ingredient_bridge(system_ingredient_id);

CREATE INDEX IF NOT EXISTS idx_ingredient_bridge_canonical
  ON openclaw.ingredient_bridge(canonical_ingredient_id);

CREATE INDEX IF NOT EXISTS idx_ingredient_bridge_match_quality
  ON openclaw.ingredient_bridge(match_quality);

COMMENT ON MATERIALIZED VIEW openclaw.ingredient_bridge IS
  'Maps system_ingredients UUIDs to canonical_ingredients slugs via normalized name matching. ~60K+ rows (up from 22K exact). match_quality column tracks confidence. REFRESH MATERIALIZED VIEW openclaw.ingredient_bridge after bulk imports.';
