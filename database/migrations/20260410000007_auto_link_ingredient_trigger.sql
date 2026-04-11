-- Auto-link chef ingredients to system_ingredients via trigram similarity
--
-- When a chef creates an ingredient (e.g. "Garlic Cloves"), this trigger
-- automatically matches it to the nearest system_ingredient ("Garlic, raw")
-- at similarity >= 0.65. The link enables:
--   - Dietary knowledge panel on events (dietary_flags from ingredient_knowledge)
--   - Knowledge panel in price catalog
--   - Market price suggestions from openclaw.canonical_ingredients
--
-- Requires: pg_trgm (already loaded as extensions.pg_trgm)
-- Safe: only fills NULL system_ingredient_id, never overwrites manual links.

-- ============================================================================
-- 1. Trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_link_ingredient_to_system()
RETURNS TRIGGER AS $$
DECLARE
  matched_id  UUID;
  best_sim    NUMERIC;
BEGIN
  -- Skip if already linked manually
  IF NEW.system_ingredient_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Find best match by trigram similarity on normalized names.
  -- Threshold 0.65: high enough to avoid false positives on short names
  -- like "oil" or "salt" while catching "Chicken Breast" -> "Chicken, broilers or fryers".
  SELECT si.id,
         extensions.similarity(lower(NEW.name), lower(si.name)) AS sim
  INTO   matched_id, best_sim
  FROM   system_ingredients si
  WHERE  si.is_active = true
    AND  extensions.similarity(lower(NEW.name), lower(si.name)) > 0.65
  ORDER BY sim DESC
  LIMIT 1;

  IF matched_id IS NOT NULL THEN
    NEW.system_ingredient_id := matched_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Trigger on INSERT (fires before the row is written, so we can mutate NEW)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_auto_link_ingredient_to_system ON ingredients;

CREATE TRIGGER trg_auto_link_ingredient_to_system
  BEFORE INSERT ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_ingredient_to_system();
