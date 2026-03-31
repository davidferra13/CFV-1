-- Fix product data quality: mark non-food categories and products correctly,
-- add is_food column to products table for direct filtering.

-- Step 1: Fix product_categories.is_food for known non-food categories
UPDATE openclaw.product_categories
SET is_food = false
WHERE slug IN (
  'personal-care',
  'household',
  'pets',
  'pet',
  'health-care',
  'baby',
  'kitchen-supplies'
);

-- Step 2: Add is_food column to products table
ALTER TABLE openclaw.products
ADD COLUMN IF NOT EXISTS is_food BOOLEAN NOT NULL DEFAULT true;

-- Step 3: Mark products as non-food based on their category
UPDATE openclaw.products p
SET is_food = false
FROM openclaw.product_categories pc
WHERE p.category_id = pc.id
  AND pc.is_food = false;

-- Step 4: Mark products as non-food based on keyword patterns
-- (catches non-food items in mixed categories like "Other")
UPDATE openclaw.products
SET is_food = false
WHERE is_food = true
  AND (
    -- Pet products
    name ILIKE '%dog treat%' OR name ILIKE '%cat treat%'
    OR name ILIKE '%dog food%' OR name ILIKE '%cat food%'
    OR name ILIKE '%pet food%' OR name ILIKE '%cat litter%'
    OR name ILIKE '%puppy%chow%' OR name ILIKE '%kitten%chow%'
    OR name ILIKE '%flea %' OR name ILIKE '%tick %collar%'
    -- Household cleaning / paper
    OR name ILIKE '%paper towel%' OR name ILIKE '%toilet paper%'
    OR name ILIKE '%trash bag%' OR name ILIKE '%garbage bag%'
    OR name ILIKE '%laundry detergent%' OR name ILIKE '%fabric softener%'
    OR name ILIKE '%dishwasher detergent%' OR name ILIKE '%dish soap%'
    OR name ILIKE '%bleach%cleaner%' OR name ILIKE '%toilet%cleaner%'
    OR name ILIKE '%floor cleaner%' OR name ILIKE '%all-purpose cleaner%'
    OR name ILIKE '%swiffer%' OR name ILIKE '%windex%'
    -- Personal care / health
    OR name ILIKE '%toothpaste%' OR name ILIKE '%toothbrush%'
    OR name ILIKE '%shampoo%' OR name ILIKE '%conditioner%hair%'
    OR name ILIKE '%body wash%' OR name ILIKE '%deodorant%'
    OR name ILIKE '%diaper%' OR name ILIKE '%baby wipe%'
    OR name ILIKE '%bandage%' OR name ILIKE '%band-aid%'
    OR name ILIKE '%ibuprofen%' OR name ILIKE '%acetaminophen%'
    OR name ILIKE '%melatonin%' OR name ILIKE '%vitamin %supplement%'
    -- Kitchen / home supplies
    OR name ILIKE '%aluminum foil%' OR name ILIKE '%plastic wrap%'
    OR name ILIKE '%parchment paper%' OR name ILIKE '%wax paper%'
    OR name ILIKE '%paper plate%' OR name ILIKE '%plastic cup%'
    OR name ILIKE '%plastic fork%' OR name ILIKE '%plastic spoon%'
    -- Electronics / obviously non-food
    OR name ILIKE '%ipad%' OR name ILIKE '%iphone%'
    OR name ILIKE '%battery%' OR name ILIKE '%charger%'
    OR name ILIKE '%light bulb%' OR name ILIKE '%lawn mower%'
  );

-- Step 5: Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_openclaw_products_is_food
ON openclaw.products (is_food) WHERE is_food = true;

-- Step 6: Delete normalization_map entries that reference non-food products
DELETE FROM openclaw.normalization_map nm
WHERE EXISTS (
  SELECT 1 FROM openclaw.products p
  WHERE LOWER(p.name) = nm.raw_name
    AND p.is_food = false
);
