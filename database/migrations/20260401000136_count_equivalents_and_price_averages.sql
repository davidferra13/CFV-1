-- Migration: Count-to-weight equivalents + regional price averages
-- Part of Universal Price Intelligence spec
-- All changes are additive: new columns, new materialized views, seed data

-- 1. Add count-to-weight columns to system_ingredients
ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS count_unit TEXT,
  ADD COLUMN IF NOT EXISTS count_weight_grams NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS count_notes TEXT;

-- 2. Create regional price averages materialized view
-- Cross-store average price per ingredient (refreshed after each sync)
CREATE MATERIALIZED VIEW IF NOT EXISTS regional_price_averages AS
SELECT
  iph.ingredient_id,
  i.name AS ingredient_name,
  i.category,
  COUNT(DISTINCT iph.store_name) AS store_count,
  ROUND(AVG(iph.price_per_unit_cents)) AS avg_price_per_unit_cents,
  MIN(iph.price_per_unit_cents) AS min_price_per_unit_cents,
  MAX(iph.price_per_unit_cents) AS max_price_per_unit_cents,
  MODE() WITHIN GROUP (ORDER BY iph.unit) AS most_common_unit,
  MAX(iph.purchase_date) AS most_recent_date
FROM ingredient_price_history iph
JOIN ingredients i ON i.id = iph.ingredient_id
WHERE iph.source LIKE 'openclaw_%'
  AND iph.purchase_date > CURRENT_DATE - INTERVAL '60 days'
  AND iph.price_per_unit_cents > 0
  AND iph.price_per_unit_cents < 50000
GROUP BY iph.ingredient_id, i.name, i.category
HAVING COUNT(DISTINCT iph.store_name) >= 2;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rpa_ingredient ON regional_price_averages(ingredient_id);

-- 3. Create category price baselines materialized view
-- Category-level average for last-resort fallback
CREATE MATERIALIZED VIEW IF NOT EXISTS category_price_baselines AS
SELECT
  i.category,
  COUNT(DISTINCT iph.ingredient_id) AS ingredient_count,
  ROUND(AVG(iph.price_per_unit_cents)) AS avg_cents_per_unit,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY iph.price_per_unit_cents) AS median_cents_per_unit,
  MODE() WITHIN GROUP (ORDER BY iph.unit) AS most_common_unit
FROM ingredient_price_history iph
JOIN ingredients i ON i.id = iph.ingredient_id
WHERE iph.source LIKE 'openclaw_%'
  AND iph.purchase_date > CURRENT_DATE - INTERVAL '90 days'
  AND iph.price_per_unit_cents > 0
  AND iph.price_per_unit_cents < 50000
GROUP BY i.category
HAVING COUNT(DISTINCT iph.ingredient_id) >= 5;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cpb_category ON category_price_baselines(category);

-- 4. Seed count-to-weight equivalents for common items
-- Fresh herbs (standard grocery bunch ~ 2oz / 56g)
UPDATE system_ingredients SET count_unit = 'bunch', count_weight_grams = 56, count_notes = 'standard grocery bunch (~2oz)'
  WHERE LOWER(name) IN ('cilantro', 'parsley', 'dill', 'mint', 'basil', 'chives', 'watercress', 'tarragon');

-- Leafy greens (larger bunches ~ 6oz / 170g)
UPDATE system_ingredients SET count_unit = 'bunch', count_weight_grams = 170, count_notes = 'standard grocery bunch (~6oz)'
  WHERE LOWER(name) IN ('kale', 'collard greens', 'swiss chard', 'spinach', 'mustard greens');

-- Garlic (head)
UPDATE system_ingredients SET count_unit = 'head', count_weight_grams = 56, count_notes = 'medium head (~2oz)'
  WHERE LOWER(name) = 'garlic';

-- Cabbage family (medium head)
UPDATE system_ingredients SET count_unit = 'head', count_weight_grams = 750, count_notes = 'medium head (~1.65lb)'
  WHERE LOWER(name) IN ('cabbage', 'napa cabbage', 'red cabbage');

-- Cauliflower/broccoli (medium head)
UPDATE system_ingredients SET count_unit = 'head', count_weight_grams = 600, count_notes = 'medium head (~1.3lb)'
  WHERE LOWER(name) IN ('cauliflower', 'broccoli');

-- Lettuce (medium head)
UPDATE system_ingredients SET count_unit = 'head', count_weight_grams = 500, count_notes = 'medium head (~1.1lb)'
  WHERE LOWER(name) IN ('iceberg lettuce', 'romaine lettuce', 'butter lettuce');

-- Garlic clove (overrides head for clove-specific lookup)
-- Note: garlic already set to 'head' above; clove lookups handled in code via unit matching

-- Sprigs
UPDATE system_ingredients SET count_unit = 'sprig', count_weight_grams = 2, count_notes = 'standard sprig (~2g)'
  WHERE LOWER(name) IN ('thyme', 'rosemary', 'tarragon', 'oregano');

-- Standard cans (14.5oz / 411g)
UPDATE system_ingredients SET count_unit = 'can', count_weight_grams = 411, count_notes = 'standard 14.5oz can'
  WHERE LOWER(name) IN ('diced tomatoes', 'crushed tomatoes', 'tomato sauce', 'coconut milk', 'black beans', 'kidney beans', 'chickpeas', 'cannellini beans', 'pinto beans', 'corn');

-- Small cans (6oz / 170g)
UPDATE system_ingredients SET count_unit = 'can', count_weight_grams = 170, count_notes = 'standard 6oz can'
  WHERE LOWER(name) = 'tomato paste';

-- Butter sticks (US standard 4oz / 113g)
UPDATE system_ingredients SET count_unit = 'stick', count_weight_grams = 113, count_notes = 'standard US stick (4oz/113g)'
  WHERE LOWER(name) IN ('butter', 'unsalted butter', 'salted butter');

-- Eggs (large)
UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 50, count_notes = 'large egg (~50g without shell)'
  WHERE LOWER(name) IN ('egg', 'eggs');

-- Common fruits/vegetables (each)
UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 182, count_notes = 'medium apple (~6.4oz)'
  WHERE LOWER(name) IN ('apple', 'fuji apple', 'gala apple', 'granny smith apple', 'honeycrisp apple');

UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 150, count_notes = 'medium onion (~5.3oz)'
  WHERE LOWER(name) IN ('onion', 'yellow onion', 'white onion', 'red onion');

UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 150, count_notes = 'medium lemon/lime (~5.3oz)'
  WHERE LOWER(name) IN ('lemon', 'lime');

UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 200, count_notes = 'medium orange (~7oz)'
  WHERE LOWER(name) = 'orange';

UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 150, count_notes = 'medium bell pepper (~5.3oz)'
  WHERE LOWER(name) IN ('bell pepper', 'red bell pepper', 'green bell pepper', 'yellow bell pepper');

UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 200, count_notes = 'medium potato (~7oz)'
  WHERE LOWER(name) IN ('potato', 'russet potato', 'yukon gold potato');

UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 150, count_notes = 'medium sweet potato (~5.3oz)'
  WHERE LOWER(name) = 'sweet potato';

UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 170, count_notes = 'medium avocado (~6oz)'
  WHERE LOWER(name) = 'avocado';

UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 120, count_notes = 'medium banana (~4.2oz)'
  WHERE LOWER(name) = 'banana';
