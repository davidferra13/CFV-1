-- =====================================================================================
-- INGREDIENT KNOWLEDGE v2 - image, nutrition, section data
-- Extends ingredient_knowledge with fields populated by the improved enrichment script
-- =====================================================================================

ALTER TABLE ingredient_knowledge
  ADD COLUMN IF NOT EXISTS image_url       TEXT,          -- Wikipedia thumbnail URL
  ADD COLUMN IF NOT EXISTS nutrition_json  JSONB,         -- USDA FDC macros + vitamins
  ADD COLUMN IF NOT EXISTS culinary_section TEXT,         -- Raw "Culinary use" section text
  ADD COLUMN IF NOT EXISTS history_section  TEXT;         -- Raw "History" section text

CREATE INDEX IF NOT EXISTS idx_ingredient_knowledge_has_image
  ON ingredient_knowledge (id)
  WHERE image_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ingredient_knowledge_has_nutrition
  ON ingredient_knowledge (id)
  WHERE nutrition_json IS NOT NULL;
