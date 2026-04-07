-- Populate the ingredient hierarchy using existing category/subcategory data.
-- Creates parent nodes for each category and subcategory, then links children.
--
-- Hierarchy: category -> subcategory -> individual ingredients
-- e.g., protein -> beef -> beef-ground, beef-sirloin, beef-chuck

-- ══════════════════════════════════════════════════
-- Step 1: Create category-level parent ingredients
-- ══════════════════════════════════════════════════

INSERT INTO system_ingredients (id, name, category, subcategory, hierarchy_depth, is_leaf, yield_pct)
SELECT
  gen_random_uuid(),
  INITCAP(REPLACE(category::text, '_', ' ')),
  category,
  NULL,
  0,
  false,
  1.0
FROM (SELECT DISTINCT category FROM system_ingredients WHERE category IS NOT NULL) cats
WHERE NOT EXISTS (
  SELECT 1 FROM system_ingredients si2
  WHERE si2.name = INITCAP(REPLACE(cats.category, '_', ' '))
    AND si2.hierarchy_depth = 0
    AND si2.is_leaf = false
);

-- ══════════════════════════════════════════════════
-- Step 2: Create subcategory-level parent ingredients
-- ══════════════════════════════════════════════════

INSERT INTO system_ingredients (id, name, category, subcategory, hierarchy_depth, is_leaf, yield_pct)
SELECT
  gen_random_uuid(),
  INITCAP(REPLACE(sub.subcategory::text, '_', ' ')) || ' (' || INITCAP(REPLACE(sub.category::text, '_', ' ')) || ')',
  sub.category,
  sub.subcategory,
  1,
  false,
  1.0
FROM (
  SELECT DISTINCT category, subcategory
  FROM system_ingredients
  WHERE category IS NOT NULL AND subcategory IS NOT NULL AND subcategory != ''
) sub
WHERE NOT EXISTS (
  SELECT 1 FROM system_ingredients si2
  WHERE si2.category = sub.category
    AND si2.subcategory = sub.subcategory
    AND si2.hierarchy_depth = 1
    AND si2.is_leaf = false
);

-- ══════════════════════════════════════════════════
-- Step 3: Link subcategory parents to category parents
-- ══════════════════════════════════════════════════

UPDATE system_ingredients child
SET parent_id = parent.id
FROM system_ingredients parent
WHERE parent.hierarchy_depth = 0
  AND parent.is_leaf = false
  AND child.hierarchy_depth = 1
  AND child.is_leaf = false
  AND child.category = parent.category
  AND child.parent_id IS NULL;

-- ══════════════════════════════════════════════════
-- Step 4: Link leaf ingredients to subcategory parents
-- ══════════════════════════════════════════════════

UPDATE system_ingredients child
SET parent_id = parent.id, hierarchy_depth = 2
FROM system_ingredients parent
WHERE parent.hierarchy_depth = 1
  AND parent.is_leaf = false
  AND child.is_leaf = true
  AND child.category = parent.category
  AND child.subcategory = parent.subcategory
  AND child.subcategory IS NOT NULL
  AND child.subcategory != ''
  AND child.parent_id IS NULL;

-- ══════════════════════════════════════════════════
-- Step 5: Link remaining leaf ingredients (no subcategory) to category parents
-- ══════════════════════════════════════════════════

UPDATE system_ingredients child
SET parent_id = parent.id, hierarchy_depth = 1
FROM system_ingredients parent
WHERE parent.hierarchy_depth = 0
  AND parent.is_leaf = false
  AND child.is_leaf = true
  AND child.category = parent.category
  AND (child.subcategory IS NULL OR child.subcategory = '')
  AND child.parent_id IS NULL;
