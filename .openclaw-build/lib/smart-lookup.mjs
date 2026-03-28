/**
 * OpenClaw - Smart Ingredient Lookup
 * Prioritizes priced items and uses common aliases for accurate results.
 * Replaces the naive LIKE-based search that returns wrong matches.
 */

// Common name -> canonical ID aliases
// Maps what people actually search for to the right canonical ingredient
const COMMON_ALIASES = {
  // Proteins
  'chicken breast': 'chicken-breast-boneless-skinless',
  'chicken thigh': 'chicken-thighs',
  'chicken thighs': 'chicken-thighs',
  'chicken wing': 'chicken-wings',
  'chicken wings': 'chicken-wings',
  'chicken drumstick': 'chicken-drumsticks',
  'whole chicken': 'chicken-whole',
  'ground chicken': 'chicken-ground',
  'ground beef': 'beef-ground',
  'ground turkey': 'turkey-ground',
  'turkey': 'turkey-breast',
  'turkey breast': 'turkey-breast',
  'steak': 'beef-ribeye',
  'ribeye': 'beef-ribeye',
  'ribeye steak': 'beef-ribeye',
  'sirloin': 'beef-sirloin',
  'sirloin steak': 'beef-sirloin',
  'chuck roast': 'beef-chuck-roast',
  'prime rib': 'beef-prime-rib',
  'tenderloin': 'beef-tenderloin',
  'pork chop': 'pork-chops',
  'pork chops': 'pork-chops',
  'pork shoulder': 'pork-shoulder',
  'ham': 'ham-sliced',
  'bacon': 'bacon',
  'sausage': 'sausage',
  'italian sausage': 'sausage-italian',
  'kielbasa': 'sausage-kielbasa',
  'chorizo': 'sausage-chorizo',
  'hot dog': 'hot-dogs',
  'hot dogs': 'hot-dogs',
  'pepperoni': 'pepperoni',
  'salami': 'salami',
  'lamb chop': 'lamb-rack',
  'lamb chops': 'lamb-rack',
  'rack of lamb': 'lamb-rack',
  'leg of lamb': 'lamb-leg',
  'lamb shank': 'lamb-shank',
  'veal': 'beef-tenderloin', // closest available

  // Seafood
  'salmon': 'salmon-atlantic-fillet',
  'salmon fillet': 'salmon-atlantic-fillet',
  'tuna': 'tuna-canned',
  'ahi tuna': 'tuna-ahi',
  'canned tuna': 'tuna-canned',
  'shrimp': 'shrimp-large',
  'cod': 'cod-fillet',
  'cod fillet': 'cod-fillet',
  'haddock': 'haddock-fillet',
  'tilapia': 'tilapia',
  'lobster': 'lobster-whole',
  'scallops': 'scallops-sea',
  'crab': 'crab-meat',
  'crab meat': 'crab-meat',
  'mussels': 'mussels',
  'clams': 'clams-littleneck',
  'oysters': 'oysters',

  // Dairy
  'butter': 'butter-unsalted',
  'unsalted butter': 'butter-unsalted',
  'milk': 'milk-whole',
  'whole milk': 'milk-whole',
  'cheese': 'cheese-cheddar',
  'cheddar': 'cheese-cheddar',
  'cheddar cheese': 'cheese-cheddar',
  'mozzarella': 'cheese-mozzarella',
  'mozzarella cheese': 'cheese-mozzarella',
  'fresh mozzarella': 'cheese-mozzarella-fresh',
  'parmesan': 'cheese-parmesan',
  'parmesan cheese': 'cheese-parmesan',
  'cream cheese': 'cream-cheese',
  'swiss cheese': 'cheese-swiss',
  'swiss': 'cheese-swiss',
  'brie': 'cheese-brie',
  'feta': 'cheese-feta',
  'feta cheese': 'cheese-feta',
  'goat cheese': 'cheese-goat',
  'gouda': 'cheese-gouda',
  'gruyere': 'cheese-gruyere',
  'havarti': 'cheese-havarti',
  'provolone': 'cheese-provolone',
  'ricotta': 'cheese-ricotta',
  'string cheese': 'cheese-string',
  'american cheese': 'cheese-american',
  'eggs': 'eggs-large',
  'egg': 'eggs-large',
  'large eggs': 'eggs-large',
  'heavy cream': 'cream-heavy',
  'cream': 'cream-heavy',
  'half and half': 'half-and-half',
  'sour cream': 'sour-cream',
  'yogurt': 'yogurt-greek',
  'greek yogurt': 'yogurt-greek',
  'plain yogurt': 'yogurt-plain',

  // Produce - Vegetables
  'onion': 'onion-yellow',
  'yellow onion': 'onion-yellow',
  'onions': 'onion-yellow',
  'potato': 'potato-russet',
  'potatoes': 'potato-russet',
  'russet potato': 'potato-russet',
  'tomato': 'tomato',
  'tomatoes': 'tomato',
  'carrot': 'carrot',
  'carrots': 'carrot',
  'broccoli': 'broccoli',
  'spinach': 'usda-spinach-raw', // USDA catalog
  'lettuce': 'usda-lettuce-iceberg-includes-crisphead-types-raw',
  'corn': 'corn-sweet',
  'sweet corn': 'corn-sweet',
  'bell pepper': 'bell-pepper-red',
  'red bell pepper': 'bell-pepper-red',
  'bell peppers': 'bell-pepper-red',
  'mushroom': 'mushroom-button',
  'mushrooms': 'mushroom-button',
  'garlic': 'garlic',
  'avocado': 'avocado',
  'cucumber': 'cucumber',
  'green bean': 'green-beans',
  'green beans': 'green-beans',
  'asparagus': 'asparagus',
  'brussels sprouts': 'brussels-sprouts',
  'celery': 'usda-celery-raw',
  'kale': 'kale',
  'artichoke': 'artichoke',
  'ginger': 'ginger-fresh',

  // Produce - Fruits
  'apple': 'apple',
  'apples': 'apple',
  'banana': 'banana',
  'bananas': 'banana',
  'lemon': 'lemon',
  'lemons': 'lemon',
  'lime': 'lime',
  'limes': 'lime',
  'orange': 'orange',
  'oranges': 'orange',
  'strawberry': 'strawberries',
  'strawberries': 'strawberries',
  'blueberry': 'blueberries',
  'blueberries': 'blueberries',
  'raspberry': 'raspberries',
  'raspberries': 'raspberries',
  'blackberry': 'blackberries',
  'blackberries': 'blackberries',
  'grapes': 'grapes',
  'grape': 'grapes',
  'mango': 'mango',
  'cantaloupe': 'cantaloupe',
  'watermelon': 'watermelon',
  'cranberries': 'cranberries',

  // Grains & Bread
  'rice': 'rice-white-long',
  'white rice': 'rice-white-long',
  'pasta': 'pasta',
  'spaghetti': 'pasta-spaghetti',
  'bread': 'bread-white',
  'white bread': 'bread-white',
  'whole wheat bread': 'bread-whole-wheat',
  'flour': 'flour-all-purpose',
  'all purpose flour': 'flour-all-purpose',
  'oatmeal': 'oats-rolled',
  'oats': 'oats-rolled',
  'rolled oats': 'oats-rolled',
  'cereal': 'oats-rolled',
  'tortillas': 'tortilla-flour',
  'flour tortilla': 'tortilla-flour',
  'bagel': 'bagels',
  'bagels': 'bagels',
  'english muffin': 'english-muffins',
  'english muffins': 'english-muffins',
  'pizza dough': 'pizza-dough',
  'breadcrumbs': 'breadcrumbs',
  'crackers': 'crackers-ritz',

  // Pantry & Condiments
  'sugar': 'sugar-granulated',
  'granulated sugar': 'sugar-granulated',
  'honey': 'honey',
  'maple syrup': 'maple-syrup',
  'vanilla extract': 'vanilla-extract',
  'vanilla': 'vanilla-extract',
  'olive oil': 'olive-oil-evoo',
  'extra virgin olive oil': 'olive-oil-evoo',
  'vegetable oil': 'usda-oil-vegetable-canola',
  'soy sauce': 'soy-sauce',
  'ketchup': 'ketchup',
  'mustard': 'mustard-yellow',
  'yellow mustard': 'mustard-yellow',
  'mayonnaise': 'usda-mayonnaise-no-cholesterol', // try Flipp mayo first
  'mayo': 'usda-mayonnaise-no-cholesterol',
  'vinegar': 'usda-vinegar-cider',
  'salt': 'salt-sea',
  'pepper': 'usda-spices-pepper-black',
  'black pepper': 'usda-spices-pepper-black',
  'peanut butter': 'peanut-butter',
  'jelly': 'usda-jellies',
  'jam': 'usda-jellies',
  'hot sauce': 'usda-sauce-hot-chile-sriracha',
  'salsa': 'salsa-jarred',
  'marinara': 'marinara-jarred',
  'alfredo sauce': 'alfredo-jarred',
  'chicken stock': 'stock-chicken',
  'chicken broth': 'stock-chicken',
  'chocolate chips': 'chocolate-chips-semi',
  'pickles': 'pickles-dill',
  'olives': 'olives-black',
  'chickpeas': 'chickpeas-canned',

  // Herbs
  'dill': 'dill-fresh',
  'fresh dill': 'dill-fresh',
  'mint': 'mint-fresh',
  'fresh mint': 'mint-fresh',
  'rosemary': 'rosemary-fresh',
  'fresh rosemary': 'rosemary-fresh',

  // Spices
  'cinnamon': 'cinnamon-ground',
  'ground cinnamon': 'cinnamon-ground',
  'cumin': 'usda-spices-cumin-seed',
  'oregano': 'usda-spices-oregano-dried',
  'basil': 'usda-basil-fresh',
  'paprika': 'usda-spices-paprika',
  'chili powder': 'usda-spices-chili-powder',
  'garlic powder': 'usda-spices-garlic-powder',
  'onion powder': 'usda-spices-onion-powder',
  'thyme': 'usda-spices-thyme-dried',
  'bay leaf': 'usda-spices-bay-leaf',
  'nutmeg': 'usda-spices-nutmeg-ground',

  // Frozen/Dessert
  'ice cream': 'usda-ice-creams-vanilla',
  'cookie': 'usda-cookies-chocolate-chip-commercially-prepared-regular-higher-fat-enriched',
  'cookies': 'usda-cookies-chocolate-chip-commercially-prepared-regular-higher-fat-enriched',

  // Beverages
  'coffee': 'coffee-ground',
  'ground coffee': 'coffee-ground',
  'tea': 'tea-black',
  'black tea': 'tea-black',
  'orange juice': 'juice-orange',
  'soda': 'usda-carbonated-beverage-cola-contains-caffeine',

  // Legumes
  'black bean': 'usda-beans-black-mature-seeds-raw',
  'black beans': 'usda-beans-black-mature-seeds-raw',
  'lentil': 'usda-lentils-raw',
  'lentils': 'usda-lentils-raw',
};

/**
 * Smart ingredient lookup - finds the best match with price priority.
 * @param {import('better-sqlite3').Database} db
 * @param {string} query - what the user is searching for
 * @returns {{ ingredient_id, name, category, best_price, best_unit, best_store, price_count } | null}
 */
export function smartLookup(db, query) {
  const q = query.toLowerCase().trim();

  // Step 1: Try common alias (direct canonical ID match)
  const aliasId = COMMON_ALIASES[q];
  if (aliasId) {
    const result = lookupById(db, aliasId);
    if (result) return result;
  }

  // Step 2: Try slugified query as ID
  const slugId = q.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
  const bySlug = lookupById(db, slugId);
  if (bySlug) return bySlug;

  // Step 3: Search with price priority (priced items first, then best name match)
  const results = db.prepare(`
    SELECT ci.ingredient_id, ci.name, ci.category,
      (SELECT MIN(cp.price_cents) FROM current_prices cp WHERE cp.canonical_ingredient_id = ci.ingredient_id) as best_price,
      (SELECT cp.price_unit FROM current_prices cp WHERE cp.canonical_ingredient_id = ci.ingredient_id ORDER BY cp.price_cents ASC LIMIT 1) as best_unit,
      (SELECT sr.name FROM current_prices cp JOIN source_registry sr ON cp.source_id = sr.source_id WHERE cp.canonical_ingredient_id = ci.ingredient_id ORDER BY cp.price_cents ASC LIMIT 1) as best_store,
      (SELECT COUNT(*) FROM current_prices cp WHERE cp.canonical_ingredient_id = ci.ingredient_id) as price_count
    FROM canonical_ingredients ci
    WHERE ci.name LIKE ? OR ci.ingredient_id LIKE ?
    ORDER BY
      -- Priced items always come first
      CASE WHEN (SELECT COUNT(*) FROM current_prices cp WHERE cp.canonical_ingredient_id = ci.ingredient_id) > 0 THEN 0 ELSE 1 END,
      -- Exact name match
      CASE WHEN LOWER(ci.name) = ? THEN 0
           -- Name starts with query
           WHEN LOWER(ci.name) LIKE ? THEN 1
           -- ID starts with query slug
           WHEN ci.ingredient_id LIKE ? THEN 2
           -- Name contains query as a word boundary
           WHEN LOWER(ci.name) LIKE ? THEN 3
           ELSE 4 END,
      -- Shorter names preferred (more specific)
      LENGTH(ci.name) ASC
    LIMIT 1
  `).get(
    `%${q}%`, `%${slugId}%`,
    q,
    `${q}%`,
    `${slugId}%`,
    `% ${q}%`
  );

  return results || null;
}

/**
 * Lookup by exact canonical ID
 */
function lookupById(db, id) {
  return db.prepare(`
    SELECT ci.ingredient_id, ci.name, ci.category,
      (SELECT MIN(cp.price_cents) FROM current_prices cp WHERE cp.canonical_ingredient_id = ci.ingredient_id) as best_price,
      (SELECT cp.price_unit FROM current_prices cp WHERE cp.canonical_ingredient_id = ci.ingredient_id ORDER BY cp.price_cents ASC LIMIT 1) as best_unit,
      (SELECT sr.name FROM current_prices cp JOIN source_registry sr ON cp.source_id = sr.source_id WHERE cp.canonical_ingredient_id = ci.ingredient_id ORDER BY cp.price_cents ASC LIMIT 1) as best_store,
      (SELECT COUNT(*) FROM current_prices cp WHERE cp.canonical_ingredient_id = ci.ingredient_id) as price_count
    FROM canonical_ingredients ci
    WHERE ci.ingredient_id = ?
  `).get(id) || null;
}

/**
 * Batch lookup - look up multiple items at once
 * @param {import('better-sqlite3').Database} db
 * @param {string[]} queries
 * @returns {Map<string, object>}
 */
export function batchLookup(db, queries) {
  const results = new Map();
  for (const q of queries) {
    results.set(q, smartLookup(db, q));
  }
  return results;
}

/**
 * Enriched lookup - returns full context for the sync: all prices, trends, normalized units.
 * Used by POST /api/prices/enriched endpoint.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} query - ingredient name to look up
 * @returns {Object|null} enriched result with best_price, all_prices, trend data
 */
export function smartLookupEnriched(db, query) {
  const base = smartLookup(db, query);
  if (!base) return null;

  // Get ALL prices for this ingredient across all stores
  const allPrices = db.prepare(`
    SELECT cp.price_cents, cp.normalized_price_cents, cp.normalized_unit,
           cp.price_unit, cp.raw_product_name,
           sr.name as store, sr.pricing_tier,
           cp.confidence as tier, cp.last_confirmed_at
    FROM current_prices cp
    JOIN source_registry sr ON cp.source_id = sr.source_id
    WHERE cp.canonical_ingredient_id = ?
    ORDER BY COALESCE(cp.normalized_price_cents, cp.price_cents) ASC
  `).all(base.ingredient_id);

  if (allPrices.length === 0) {
    return {
      canonical_id: base.ingredient_id,
      name: base.name,
      category: base.category,
      best_price: null,
      all_prices: [],
      trend: null,
      price_count: 0,
    };
  }

  // Build best_price from lowest normalized price
  const best = allPrices[0];
  const bestPrice = {
    cents: best.price_cents,
    normalized_cents: best.normalized_price_cents || best.price_cents,
    normalized_unit: best.normalized_unit || best.price_unit,
    original_unit: best.price_unit,
    store: best.store,
    tier: best.tier || 'flyer_scrape',
    confirmed_at: best.last_confirmed_at,
  };

  // Build all_prices array
  const formattedPrices = allPrices.map(p => ({
    cents: p.price_cents,
    normalized_cents: p.normalized_price_cents || p.price_cents,
    normalized_unit: p.normalized_unit || p.price_unit,
    store: p.store,
    tier: p.tier || 'flyer_scrape',
    confirmed_at: p.last_confirmed_at,
  }));

  // Get trend data from price_changes table
  let trend = null;
  try {
    const changes7d = db.prepare(`
      SELECT AVG(change_pct) as avg_change
      FROM price_changes
      WHERE canonical_ingredient_id = ?
        AND observed_at > datetime('now', '-7 days')
        AND change_pct IS NOT NULL
    `).get(base.ingredient_id);

    const changes30d = db.prepare(`
      SELECT AVG(change_pct) as avg_change
      FROM price_changes
      WHERE canonical_ingredient_id = ?
        AND observed_at > datetime('now', '-30 days')
        AND change_pct IS NOT NULL
    `).get(base.ingredient_id);

    if (changes7d?.avg_change !== null || changes30d?.avg_change !== null) {
      const change7d = changes7d?.avg_change ? Math.round(changes7d.avg_change * 10) / 10 : null;
      const change30d = changes30d?.avg_change ? Math.round(changes30d.avg_change * 10) / 10 : null;

      trend = {
        direction: change7d !== null ? (change7d > 0 ? 'up' : change7d < 0 ? 'down' : 'flat') : null,
        change_7d_pct: change7d,
        change_30d_pct: change30d,
      };
    }
  } catch {
    // Trend data is optional; don't fail the whole lookup
  }

  return {
    canonical_id: base.ingredient_id,
    name: base.name,
    category: base.category,
    best_price: bestPrice,
    all_prices: formattedPrices,
    trend,
    price_count: allPrices.length,
  };
}

export { COMMON_ALIASES };
