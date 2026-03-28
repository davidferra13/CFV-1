/**
 * OpenClaw - USDA FoodData Central Scraper
 * Imports comprehensive food catalog from USDA's free API.
 *
 * Data types:
 *   - Foundation Foods (~2,800 items) - basic ingredients
 *   - SR Legacy (~7,800 items) - standard reference foods
 *
 * These provide a comprehensive food CATALOG. Prices come from Flipp.
 * The USDA data ensures we have every food item known, so when Flipp
 * has a price for it, we can match it.
 *
 * API docs: https://fdc.nal.usda.gov/api-guide.html
 * Uses DEMO_KEY (30 req/hour) or registered key (3600 req/hour).
 */

import { getDb } from '../lib/db.mjs';
import { httpFetch } from '../lib/scrape-utils.mjs';

// Free API key - get your own at https://api.data.gov/signup/ for higher limits
const API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const API_BASE = 'https://api.nal.usda.gov/fdc/v1';

// Map USDA food categories to our categories
const CATEGORY_MAP = {
  // Proteins
  'beef products': 'beef',
  'poultry products': 'poultry',
  'pork products': 'pork',
  'lamb, veal, and game products': 'lamb',
  'sausages and luncheon meats': 'pork',
  'finfish and shellfish products': 'seafood',
  // Dairy
  'dairy and egg products': 'dairy',
  // Produce
  'vegetables and vegetable products': 'produce',
  'fruits and fruit juices': 'produce',
  'legumes and legume products': 'produce',
  // Grains
  'cereal grains and pasta': 'grains',
  'breakfast cereals': 'grains',
  'baked products': 'grains',
  // Pantry
  'fats and oils': 'oils',
  'spices and herbs': 'spices',
  'soups, sauces, and gravies': 'pantry',
  'nut and seed products': 'pantry',
  'sweets': 'pantry',
  'beverages': 'beverages',
  'baby foods': 'pantry',
  'meals, entrees, and side dishes': 'pantry',
  'snacks': 'pantry',
  'fast foods': 'pantry',
  'restaurant foods': 'pantry',
  'american indian/alaska native foods': 'pantry',
  'alcoholic beverages': 'beverages',
};

function slugify(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

function categorize(foodCategory) {
  if (!foodCategory) return 'uncategorized';
  const lower = foodCategory.toLowerCase();
  return CATEGORY_MAP[lower] || 'uncategorized';
}

function cleanFoodName(description) {
  // USDA names are like "Chicken, broilers or fryers, breast, skinless, boneless, meat only, cooked, grilled"
  // Clean up to make more readable
  return description
    .replace(/,\s*(raw|cooked|roasted|grilled|baked|fried|boiled|steamed|braised|sauteed)\s*$/i, '')
    .replace(/,\s*NFS\s*$/i, '') // "not further specified"
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

async function fetchFoodsPage(dataType, pageNumber, pageSize = 200) {
  const url = `${API_BASE}/foods/list?api_key=${API_KEY}&dataType=${encodeURIComponent(dataType)}&pageSize=${pageSize}&pageNumber=${pageNumber}`;

  const res = await httpFetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`USDA API ${res.status}: ${text}`);
  }
  return res.json();
}

async function fetchSearchPage(query, pageNumber, pageSize = 200) {
  const url = `${API_BASE}/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&pageNumber=${pageNumber}&dataType=Foundation,SR%20Legacy`;

  const res = await httpFetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`USDA API ${res.status}: ${text}`);
  }
  return res.json();
}

function ensureIngredient(db, id, name, category, unit) {
  db.prepare(`
    INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit)
    VALUES (?, ?, ?, ?)
  `).run(id, name, category, unit);
}

function guessUnit(foodCategory, description) {
  const lower = (foodCategory + ' ' + description).toLowerCase();
  if (lower.match(/\b(beef|pork|chicken|turkey|lamb|veal|duck|bison|salmon|shrimp|cod|tuna|lobster|crab|fish|seafood|meat|steak|roast|chop|fillet)\b/)) return 'lb';
  if (lower.match(/\b(milk|cream|juice|broth|stock|oil|vinegar)\b/)) return 'fl_oz';
  if (lower.match(/\b(egg)\b/)) return 'each';
  if (lower.match(/\b(flour|sugar|rice|salt|spice|herb|powder|seed)\b/)) return 'lb';
  if (lower.match(/\b(fruit|vegetable|produce|apple|banana|tomato|potato|onion|carrot|lettuce)\b/)) return 'lb';
  return 'lb';
}

async function importDataType(db, dataType, label) {
  console.log(`\n--- Importing ${label} ---`);
  let page = 1;
  let totalImported = 0;
  let totalSkipped = 0;

  while (true) {
    try {
      const foods = await fetchFoodsPage(dataType, page);

      if (!foods || foods.length === 0) break;

      for (const food of foods) {
        const name = cleanFoodName(food.description || '');
        const id = `usda-${slugify(name)}`;

        if (!id || id === 'usda-' || id.length < 6) {
          totalSkipped++;
          continue;
        }

        const category = categorize(food.foodCategory?.description || food.foodCategory || '');
        const unit = guessUnit(food.foodCategory?.description || '', name);

        ensureIngredient(db, id, name, category, unit);
        totalImported++;
      }

      console.log(`  Page ${page}: ${foods.length} items (${totalImported} imported so far)`);

      if (foods.length < 200) break; // Last page
      page++;

      // Rate limiting for DEMO_KEY (30 req/hr = 1 every 2 seconds)
      if (API_KEY === 'DEMO_KEY') {
        await new Promise(r => setTimeout(r, 2500));
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      if (err.message.includes('429') || err.message.includes('OVER_RATE_LIMIT')) {
        console.log(`  Rate limited on page ${page}, waiting 60s...`);
        await new Promise(r => setTimeout(r, 60000));
        continue; // Retry same page
      }
      console.error(`  Error on page ${page}: ${err.message}`);
      break;
    }
  }

  console.log(`  ${label}: ${totalImported} imported, ${totalSkipped} skipped`);
  return totalImported;
}

// Additional comprehensive food searches to fill gaps
const SUPPLEMENTAL_SEARCHES = [
  // Common ingredients that might be missed
  'butter', 'cream', 'cheese', 'yogurt', 'milk',
  'chicken breast', 'ground beef', 'pork chop', 'salmon fillet',
  'olive oil', 'flour', 'sugar', 'rice', 'pasta',
  'tomato', 'onion', 'garlic', 'potato', 'carrot',
  'apple', 'banana', 'lemon', 'orange', 'strawberry',
  'basil', 'oregano', 'thyme', 'cumin', 'paprika',
  'bread', 'tortilla', 'bagel', 'muffin',
  'chocolate', 'vanilla', 'honey', 'maple syrup',
  'soy sauce', 'vinegar', 'mustard', 'ketchup',
  'almond', 'walnut', 'pecan', 'cashew',
  'bean', 'lentil', 'chickpea', 'tofu',
  'shrimp', 'crab', 'lobster', 'scallop',
  'bacon', 'ham', 'sausage', 'pepperoni',
];

async function importSearchResults(db) {
  console.log(`\n--- Supplemental search imports ---`);
  let totalImported = 0;

  for (const query of SUPPLEMENTAL_SEARCHES) {
    try {
      const data = await fetchSearchPage(query, 1, 50);
      const foods = data.foods || [];

      for (const food of foods) {
        const name = cleanFoodName(food.description || '');
        const id = `usda-${slugify(name)}`;

        if (!id || id === 'usda-' || id.length < 6) continue;

        const category = categorize(food.foodCategory || '');
        const unit = guessUnit(food.foodCategory || '', name);

        ensureIngredient(db, id, name, category, unit);
        totalImported++;
      }

      // Rate limiting
      if (API_KEY === 'DEMO_KEY') {
        await new Promise(r => setTimeout(r, 2500));
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      if (err.message.includes('429')) {
        console.log(`  Rate limited on "${query}", waiting 60s...`);
        await new Promise(r => setTimeout(r, 60000));
      } else {
        console.error(`  Error searching "${query}": ${err.message}`);
      }
    }
  }

  console.log(`  Supplemental: ${totalImported} imported`);
  return totalImported;
}

async function main() {
  console.log('=== OpenClaw USDA FoodData Central Import ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`API Key: ${API_KEY === 'DEMO_KEY' ? 'DEMO_KEY (rate limited)' : 'registered key'}`);

  const db = getDb();

  // Count existing
  const before = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();
  console.log(`Existing ingredients: ${before.c}`);

  // Import Foundation Foods (basic ingredients, ~2,800 items)
  const foundationCount = await importDataType(db, 'Foundation', 'Foundation Foods');

  // Import SR Legacy (standard reference, ~7,800 items)
  const srCount = await importDataType(db, 'SR Legacy', 'SR Legacy Foods');

  // Supplemental searches for common items
  const searchCount = await importSearchResults(db);

  const after = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();
  const newItems = after.c - before.c;

  console.log(`\n=== USDA Import Complete ===`);
  console.log(`Foundation Foods: ${foundationCount}`);
  console.log(`SR Legacy: ${srCount}`);
  console.log(`Supplemental: ${searchCount}`);
  console.log(`New ingredients added: ${newItems}`);
  console.log(`Total ingredients now: ${after.c}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
