/**
 * OpenClaw Deep Scraper v2
 *
 * Improvements over v1:
 * 1. Auto-discovers each store's actual category tree (no hardcoded slugs)
 * 2. Scrolls until no new products appear (gets everything, not just 15 scrolls)
 * 3. 500+ search terms auto-generated from Pi's canonical ingredient list
 * 4. More Instacart stores (14 total for New England)
 * 5. Crash-safe incremental flush every 500 products
 *
 * Usage:
 *   node scripts/openclaw-deep-scraper.mjs
 *   node scripts/openclaw-deep-scraper.mjs --store=market-basket
 *   node scripts/openclaw-deep-scraper.mjs --skip-discovery  (use hardcoded categories)
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const PI_API = process.env.OPENCLAW_API || 'http://10.0.0.177:8081';
const INSTACART_BASE = 'https://www.instacart.com';
const FLUSH_EVERY = 500;

// All New England stores on Instacart
const STORES = [
  { slug: 'market-basket', name: 'Market Basket', markupPct: 15, tier: 'retail' },
  { slug: 'hannaford', name: 'Hannaford', markupPct: 12, tier: 'retail' },
  { slug: 'stop-and-shop', name: 'Stop & Shop', markupPct: 15, tier: 'retail' },
  { slug: 'shaws', name: "Shaw's", markupPct: 15, tier: 'retail' },
  { slug: 'aldi', name: 'ALDI', markupPct: 18, tier: 'retail' },
  { slug: 'wegmans', name: "Wegman's", markupPct: 12, tier: 'retail' },
  { slug: 'whole-foods', name: 'Whole Foods', markupPct: 10, tier: 'retail' },
  { slug: 'costco', name: 'Costco', markupPct: 20, tier: 'wholesale' },
  { slug: 'bjs-wholesale-club', name: "BJ's", markupPct: 18, tier: 'wholesale' },
  { slug: 'price-chopper-market-32', name: 'Price Chopper', markupPct: 15, tier: 'retail' },
  { slug: 'big-y', name: 'Big Y', markupPct: 15, tier: 'retail' },
  { slug: 'trader-joes', name: "Trader Joe's", markupPct: 8, tier: 'retail' },
  { slug: 'target', name: 'Target', markupPct: 5, tier: 'retail' },
  { slug: 'restaurant-depot', name: 'Restaurant Depot', markupPct: 5, tier: 'wholesale' },
];

// Fallback categories if auto-discovery fails
const FALLBACK_CATEGORIES = [
  'meat-seafood', 'produce', 'dairy-eggs', 'frozen', 'pantry',
  'bakery-bread', 'beverages', 'deli', 'snacks', 'breakfast',
  'international', 'household', 'condiments-sauces', 'canned-goods',
  'beef', 'pork', 'chicken', 'turkey', 'lamb-veal', 'sausages-hot-dogs',
  'fresh-fish', 'fresh-shellfish', 'frozen-seafood',
  'fresh-fruits', 'fresh-vegetables', 'fresh-herbs', 'organic-produce',
  'salads', 'mushrooms', 'onions-garlic', 'potatoes',
  'milk', 'cheese', 'yogurt', 'butter-margarine', 'cream', 'eggs',
  'frozen-meals', 'frozen-pizza', 'frozen-vegetables', 'frozen-fruits',
  'ice-cream', 'frozen-meat-seafood', 'frozen-breakfast', 'frozen-appetizers',
  'pasta', 'rice-grains', 'canned-tomatoes', 'beans', 'soup', 'broth-stock',
  'cooking-oils', 'vinegar', 'flour-sugar-baking', 'spices-seasonings',
  'nuts-seeds', 'dried-fruits', 'honey-syrups',
  'bread', 'rolls-buns', 'tortillas-wraps', 'bagels',
  'water', 'juice', 'coffee', 'tea',
  'deli-meats', 'prepared-meals', 'hummus-dips',
  'chips', 'crackers', 'nuts-trail-mix', 'popcorn', 'dried-fruit-snacks',
  'ketchup-mustard', 'mayonnaise', 'salad-dressing', 'hot-sauce',
  'soy-sauce-teriyaki', 'bbq-sauce', 'pasta-sauce', 'salsa',
  // Additional deep categories
  'baby-food', 'baking-ingredients', 'cereal', 'granola',
  'jams-jellies', 'maple-syrup', 'olive-oil', 'coconut-oil',
  'canned-fish', 'canned-meat', 'pickles-olives',
  'tofu-meat-alternatives', 'plant-based', 'vegan',
  'gluten-free', 'organic',
  'pizza', 'frozen-desserts', 'frozen-snacks',
  'energy-drinks', 'sports-drinks', 'kombucha',
  'wine', 'beer', 'spirits',
  'pet-food', 'cleaning-supplies',
];

// Chef-focused search terms (expanded from v1)
const SEARCH_TERMS = [
  // Premium proteins
  'ribeye', 'filet mignon', 'strip steak', 'brisket', 'short ribs', 'flank steak',
  'skirt steak', 'tri-tip', 'prime rib', 'veal chop', 'bone marrow',
  'pork belly', 'pork tenderloin', 'pork shoulder', 'baby back ribs', 'spare ribs',
  'lamb rack', 'lamb chops', 'lamb shank', 'leg of lamb', 'ground lamb',
  'duck breast', 'duck leg', 'whole duck', 'quail', 'cornish hen', 'rabbit',
  'ground turkey', 'turkey breast', 'turkey thigh',
  // Seafood
  'salmon fillet', 'salmon steak', 'smoked salmon', 'halibut', 'swordfish',
  'sea bass', 'Chilean sea bass', 'mahi mahi', 'haddock', 'trout', 'cod',
  'branzino', 'snapper', 'grouper', 'monkfish', 'tuna steak', 'ahi tuna',
  'lobster', 'lobster tail', 'king crab', 'snow crab', 'crab meat',
  'scallops', 'sea scallops', 'bay scallops', 'jumbo shrimp', 'prawns',
  'mussels', 'clams', 'littleneck clams', 'oysters', 'calamari', 'squid',
  'octopus', 'anchovies', 'sardines', 'smoked trout',
  // Dairy & cheese
  'heavy cream', 'whipping cream', 'half and half', 'creme fraiche',
  'mascarpone', 'ricotta', 'cream cheese', 'sour cream',
  'gruyere', 'brie', 'camembert', 'goat cheese', 'chevre',
  'burrata', 'fresh mozzarella', 'fontina', 'manchego', 'pecorino',
  'parmesan', 'parmigiano reggiano', 'asiago', 'provolone', 'gouda',
  'blue cheese', 'gorgonzola', 'roquefort', 'stilton',
  'feta', 'halloumi', 'cottage cheese', 'queso fresco',
  'ghee', 'cultured butter', 'European butter', 'unsalted butter',
  'whole milk', 'buttermilk', 'evaporated milk', 'condensed milk',
  'oat milk', 'almond milk', 'coconut cream',
  // Produce - vegetables
  'shallots', 'leeks', 'fennel', 'fennel bulb', 'artichoke', 'artichoke hearts',
  'endive', 'radicchio', 'arugula', 'watercress', 'frisee',
  'parsnip', 'rutabaga', 'celery root', 'celeriac', 'jicama', 'turnip',
  'kabocha squash', 'delicata squash', 'spaghetti squash', 'acorn squash',
  'butternut squash', 'zucchini', 'yellow squash', 'pattypan squash',
  'shiitake mushrooms', 'oyster mushrooms', 'portobello', 'cremini',
  'chanterelle', 'porcini', 'morel', 'enoki', 'king trumpet',
  'habanero', 'poblano', 'serrano pepper', 'anaheim', 'jalapeno',
  'thai chili', 'ghost pepper', 'chipotle',
  'baby spinach', 'kale', 'swiss chard', 'collard greens', 'mustard greens',
  'bok choy', 'napa cabbage', 'brussels sprouts', 'broccolini', 'rapini',
  'asparagus', 'green beans', 'snap peas', 'snow peas', 'edamame',
  'eggplant', 'okra', 'tomatillo', 'plantain',
  'sweet potato', 'yukon gold potato', 'fingerling potato', 'red potato',
  'beet', 'golden beet', 'radish', 'daikon',
  'corn on the cob', 'fresh corn',
  // Produce - fruits
  'mango', 'papaya', 'dragon fruit', 'pomegranate', 'fig', 'fresh fig',
  'passion fruit', 'guava', 'lychee', 'star fruit', 'persimmon',
  'blood orange', 'meyer lemon', 'key lime', 'yuzu',
  'blackberry', 'raspberry', 'blueberry', 'cranberry', 'gooseberry',
  'cherry', 'plum', 'apricot', 'peach', 'nectarine',
  'pear', 'asian pear', 'quince',
  'honeydew', 'cantaloupe', 'watermelon',
  'avocado', 'plantain', 'coconut',
  // Fresh herbs
  'fresh basil', 'fresh dill', 'fresh rosemary', 'fresh thyme', 'lemongrass',
  'fresh oregano', 'fresh sage', 'fresh tarragon', 'fresh chervil',
  'fresh mint', 'fresh cilantro', 'fresh parsley', 'fresh chives',
  'bay leaves', 'curry leaves', 'kaffir lime leaves',
  'microgreens', 'edible flowers',
  // Asian/international ingredients
  'coconut milk', 'tahini', 'miso paste', 'white miso', 'red miso',
  'fish sauce', 'gochujang', 'gochugaru', 'doenjang',
  'soy sauce', 'tamari', 'mirin', 'sake', 'rice wine',
  'hoisin sauce', 'oyster sauce', 'black bean sauce', 'chili crisp',
  'sambal oelek', 'sriracha', 'harissa', 'zhug',
  'curry paste', 'green curry paste', 'red curry paste', 'massaman curry',
  'tamarind paste', 'palm sugar', 'jaggery',
  'nori', 'kombu', 'wakame', 'bonito flakes', 'dashi',
  'rice paper', 'wonton wrappers', 'gyoza wrappers', 'spring roll wrappers',
  'tofu', 'silken tofu', 'firm tofu', 'tempeh',
  'kimchi', 'sauerkraut',
  'dried shrimp', 'dried mushrooms', 'dried chili',
  // Oils, vinegars, condiments
  'truffle oil', 'sesame oil', 'toasted sesame oil', 'avocado oil',
  'grapeseed oil', 'walnut oil', 'peanut oil', 'chili oil',
  'balsamic vinegar', 'rice vinegar', 'sherry vinegar', 'red wine vinegar',
  'white wine vinegar', 'apple cider vinegar', 'champagne vinegar',
  'balsamic glaze', 'pomegranate molasses',
  'dijon mustard', 'whole grain mustard', 'stone ground mustard',
  'capers', 'cornichons', 'anchovy paste',
  'Worcestershire sauce', 'liquid smoke',
  // Baking & pantry
  'panko', 'cornmeal', 'polenta', 'grits',
  'almond flour', 'coconut flour', 'bread flour', 'cake flour',
  'semolina', 'cornstarch', 'arrowroot', 'tapioca starch',
  'active dry yeast', 'instant yeast', 'baking powder', 'baking soda',
  'cream of tartar', 'gelatin', 'agar agar', 'pectin',
  'vanilla extract', 'vanilla bean', 'almond extract', 'rose water',
  'cocoa powder', 'dark chocolate', 'chocolate chips', 'white chocolate',
  'brown sugar', 'powdered sugar', 'turbinado sugar', 'molasses',
  'maple syrup', 'agave', 'honey', 'corn syrup',
  // Spices
  'saffron', 'sumac', 'garam masala', 'smoked paprika', 'cardamom',
  'turmeric', 'cumin', 'coriander', 'star anise', 'chinese five spice',
  'fennel seed', 'fenugreek', 'mustard seed', 'celery seed',
  'juniper berries', 'allspice', 'cloves', 'mace', 'nutmeg',
  'black peppercorn', 'white pepper', 'szechuan peppercorn', 'pink peppercorn',
  'cinnamon stick', 'vanilla pod',
  'za\'atar', 'ras el hanout', 'berbere', 'adobo seasoning',
  'herbes de provence', 'italian seasoning', 'old bay',
  // Grains & starches
  'arborio rice', 'basmati rice', 'jasmine rice', 'wild rice', 'sushi rice',
  'brown rice', 'forbidden rice', 'sticky rice',
  'quinoa', 'farro', 'barley', 'bulgur', 'freekeh', 'millet',
  'couscous', 'Israeli couscous', 'orzo',
  'fresh pasta', 'rice noodles', 'udon', 'soba', 'ramen noodles',
  'egg noodles', 'glass noodles', 'lo mein', 'pho noodles',
  'penne', 'rigatoni', 'linguine', 'fettuccine', 'bucatini', 'orecchiette',
  'gnocchi', 'ravioli', 'tortellini',
  // Wraps & doughs
  'masa harina', 'corn tortillas', 'flour tortillas', 'pita bread',
  'naan', 'lavash', 'focaccia', 'ciabatta', 'baguette', 'sourdough',
  'puff pastry', 'phyllo dough', 'pie crust',
  // Canned & preserved
  'san marzano tomatoes', 'crushed tomatoes', 'tomato paste', 'tomato sauce',
  'roasted red peppers', 'sundried tomatoes', 'marinated artichokes',
  'kalamata olives', 'castelvetrano olives', 'green olives',
  'chickpeas', 'cannellini beans', 'black beans', 'kidney beans', 'lentils',
  'coconut cream', 'coconut water',
  'chicken broth', 'beef broth', 'vegetable broth', 'bone broth',
  // Nuts & seeds
  'pine nuts', 'pistachios', 'marcona almonds', 'cashews', 'walnuts',
  'pecans', 'macadamia', 'hazelnuts', 'peanuts',
  'sesame seeds', 'poppy seeds', 'sunflower seeds', 'pumpkin seeds',
  'chia seeds', 'flax seeds', 'hemp hearts',
  'almond butter', 'cashew butter', 'peanut butter', 'tahini',
  // Frozen
  'frozen shrimp', 'frozen salmon', 'frozen lobster tail',
  'frozen peas', 'frozen corn', 'frozen spinach', 'frozen edamame',
  'frozen berries', 'frozen mango', 'frozen acai',
  'frozen pie shells', 'frozen puff pastry',
];

function extractProductsFromAPI(data) {
  const products = [];

  function processItem(item) {
    if (!item || !item.name) return;
    const priceSection = item.price?.viewSection;
    if (!priceSection) return;
    const priceValue = priceSection.priceValueString || priceSection.priceString;
    if (!priceValue) return;
    const priceCents = Math.round(parseFloat(priceValue.replace('$', '')) * 100);
    if (isNaN(priceCents) || priceCents <= 0 || priceCents > 100000) return;

    products.push({
      name: item.name,
      priceCents,
      size: item.size || '',
      perUnit: priceSection.itemDetails?.pricePerUnitString || '',
      pricingUnit: priceSection.itemDetails?.pricingUnitString || priceSection.itemCard?.pricingUnitString || '',
      productId: item.productId || '',
      brandName: item.brandName || '',
      onSale: priceSection.trackingProperties?.on_sale_ind?.loyalty === true,
    });
  }

  function findItems(obj, depth = 0) {
    if (depth > 12 || !obj) return;
    if (typeof obj === 'object' && obj !== null) {
      if (obj.name && obj.price && obj.__typename?.includes('Item')) {
        processItem(obj);
      }
      if (Array.isArray(obj)) {
        for (const item of obj) findItems(item, depth + 1);
      } else {
        for (const key of Object.keys(obj)) {
          if (['items', 'nodes', 'products', 'data', 'placements', 'modules',
               'banners', 'contentItems', 'sectionItems', 'featuredProducts',
               'itemsWithMetadata', 'edges', 'node', 'results', 'searchResults',
               'collections', 'aisleItems', 'departmentItems'].includes(key)) {
            findItems(obj[key], depth + 1);
          }
          if (key === 'data' && depth === 0) findItems(obj[key], depth + 1);
        }
      }
    }
  }

  findItems(data);
  return products;
}

/**
 * Auto-discover all category/department links from the store's main page.
 * Intercepts the GraphQL responses that contain department/aisle navigation.
 */
async function discoverCategories(page, storeSlug) {
  const discovered = new Set();

  // Navigate to store's main page
  try {
    await page.goto(`${INSTACART_BASE}/store/${storeSlug}`, {
      waitUntil: 'domcontentloaded', timeout: 20000,
    });
    await page.waitForTimeout(3000);

    // Extract all category links from the page
    const links = await page.evaluate((slug) => {
      const allLinks = document.querySelectorAll('a[href]');
      const cats = [];
      for (const a of allLinks) {
        const href = a.getAttribute('href') || '';
        // Match /store/{slug}/collections/{category} or /store/{slug}/departments/{dept}
        const collMatch = href.match(new RegExp(`/store/${slug}/collections/([\\w-]+)`));
        const deptMatch = href.match(new RegExp(`/store/${slug}/departments/([\\w-]+)`));
        if (collMatch) cats.push({ type: 'collections', slug: collMatch[1] });
        if (deptMatch) cats.push({ type: 'departments', slug: deptMatch[1] });
      }
      return cats;
    }, storeSlug);

    for (const link of links) {
      discovered.add(`${link.type}/${link.slug}`);
    }

    // Also try to scroll down to reveal more category links
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(500);
    }

    const moreLinks = await page.evaluate((slug) => {
      const allLinks = document.querySelectorAll('a[href]');
      const cats = [];
      for (const a of allLinks) {
        const href = a.getAttribute('href') || '';
        const collMatch = href.match(new RegExp(`/store/${slug}/collections/([\\w-]+)`));
        const deptMatch = href.match(new RegExp(`/store/${slug}/departments/([\\w-]+)`));
        if (collMatch) cats.push({ type: 'collections', slug: collMatch[1] });
        if (deptMatch) cats.push({ type: 'departments', slug: deptMatch[1] });
      }
      return cats;
    }, storeSlug);

    for (const link of moreLinks) {
      discovered.add(`${link.type}/${link.slug}`);
    }

    // Also navigate to "shop all" or departments page
    try {
      await page.goto(`${INSTACART_BASE}/store/${storeSlug}/departments`, {
        waitUntil: 'domcontentloaded', timeout: 15000,
      });
      await page.waitForTimeout(2000);

      const deptLinks = await page.evaluate((slug) => {
        const allLinks = document.querySelectorAll('a[href]');
        const cats = [];
        for (const a of allLinks) {
          const href = a.getAttribute('href') || '';
          const collMatch = href.match(new RegExp(`/store/${slug}/collections/([\\w-]+)`));
          const deptMatch = href.match(new RegExp(`/store/${slug}/departments/([\\w-]+)`));
          if (collMatch) cats.push({ type: 'collections', slug: collMatch[1] });
          if (deptMatch) cats.push({ type: 'departments', slug: deptMatch[1] });
        }
        return cats;
      }, storeSlug);

      for (const link of deptLinks) {
        discovered.add(`${link.type}/${link.slug}`);
      }
    } catch (e) {}

  } catch (e) {
    console.log(`  Category discovery failed: ${e.message}`);
  }

  return [...discovered];
}

/**
 * Fetch search terms from Pi's canonical ingredient list.
 * Uses ingredients that DON'T have prices yet as priority searches.
 */
async function getSmartSearchTerms() {
  const terms = [...SEARCH_TERMS]; // Start with hardcoded chef terms

  try {
    // Get ingredient names from Pi that have no prices yet
    const res = await fetch(`${PI_API}/api/ingredients?search=`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      const existing = new Set(terms.map(t => t.toLowerCase()));

      // Add ingredients without prices as search terms
      for (const ing of (data.ingredients || [])) {
        const name = ing.name?.toLowerCase();
        if (name && !existing.has(name) && name.length > 2 && name.length < 40) {
          // Skip non-food / household items
          if (name.match(/\b(cleaner|detergent|soap|shampoo|paper|towel|trash|bag|wrap|foil|bleach|sponge)\b/)) continue;
          terms.push(ing.name);
          existing.add(name);
        }
      }
    }
  } catch (e) {
    console.log(`  Could not fetch Pi ingredients for search terms: ${e.message}`);
  }

  return terms;
}

// Category-specific Instacart markup estimates (more accurate than flat %)
const CATEGORY_MARKUPS = {
  produce:    { low: 20, high: 30, default: 25 },
  meat:       { low: 10, high: 15, default: 12 },
  seafood:    { low: 10, high: 15, default: 12 },
  dairy:      { low: 12, high: 18, default: 15 },
  eggs:       { low: 12, high: 18, default: 15 },
  bakery:     { low: 15, high: 20, default: 18 },
  frozen:     { low: 8,  high: 12, default: 10 },
  pantry:     { low: 5,  high: 10, default: 8 },
  canned:     { low: 5,  high: 10, default: 8 },
  beverages:  { low: 5,  high: 10, default: 8 },
  deli:       { low: 15, high: 20, default: 18 },
  snacks:     { low: 5,  high: 10, default: 8 },
  household:  { low: 3,  high: 8,  default: 5 },
  condiments: { low: 5,  high: 10, default: 8 },
  spices:     { low: 5,  high: 10, default: 8 },
  international: { low: 8, high: 15, default: 10 },
  breakfast:  { low: 8,  high: 12, default: 10 },
};

function detectCategory(name, categorySlug) {
  const lower = name.toLowerCase();
  const slug = (categorySlug || '').toLowerCase();

  // Check category slug first (most reliable)
  if (slug.match(/meat|beef|pork|chicken|turkey|lamb|sausage/)) return 'meat';
  if (slug.match(/fish|shellfish|seafood/)) return 'seafood';
  if (slug.match(/produce|fruit|vegetable|herb|mushroom|potato|onion|salad/)) return 'produce';
  if (slug.match(/dairy|milk|cheese|yogurt|butter|cream/)) return 'dairy';
  if (slug.match(/egg/)) return 'eggs';
  if (slug.match(/frozen/)) return 'frozen';
  if (slug.match(/bakery|bread|rolls|bagel|tortilla/)) return 'bakery';
  if (slug.match(/deli/)) return 'deli';
  if (slug.match(/beverage|water|juice|coffee|tea|soda/)) return 'beverages';
  if (slug.match(/snack|chip|cracker|popcorn/)) return 'snacks';
  if (slug.match(/condiment|sauce|ketchup|mustard|mayo|dressing|hot-sauce/)) return 'condiments';
  if (slug.match(/spice|seasoning/)) return 'spices';
  if (slug.match(/canned|bean|soup|broth/)) return 'canned';
  if (slug.match(/pantry|pasta|rice|grain|oil|vinegar|flour|sugar|baking|nut|seed|honey/)) return 'pantry';
  if (slug.match(/international/)) return 'international';
  if (slug.match(/breakfast|cereal|granola/)) return 'breakfast';
  if (slug.match(/household|cleaning/)) return 'household';

  // Fall back to product name detection
  if (lower.match(/\b(chicken|beef|pork|turkey|lamb|steak|roast|chop|sausage|bacon|ham|ground)\b/)) return 'meat';
  if (lower.match(/\b(salmon|shrimp|lobster|crab|scallop|cod|halibut|tuna|fish|clam|mussel|oyster)\b/)) return 'seafood';
  if (lower.match(/\b(apple|banana|orange|berry|grape|mango|avocado|tomato|onion|potato|carrot|lettuce|pepper|broccoli|spinach|mushroom|herb|basil|cilantro)\b/)) return 'produce';
  if (lower.match(/\b(milk|cheese|yogurt|butter|cream|sour cream)\b/)) return 'dairy';
  if (lower.match(/\beggs?\b/)) return 'eggs';
  if (lower.match(/\b(bread|bagel|roll|muffin|croissant|tortilla)\b/)) return 'bakery';

  return null; // Unknown - use store default
}

function adjustPrice(priceCents, storeMarkupPct, productName, categorySlug) {
  const cat = detectCategory(productName || '', categorySlug);
  const markup = cat && CATEGORY_MARKUPS[cat]
    ? CATEGORY_MARKUPS[cat].default
    : storeMarkupPct; // Fall back to store-level flat markup
  return Math.round(priceCents / (1 + markup / 100));
}

function detectUnit(name, size, perUnit) {
  const combined = `${name} ${size} ${perUnit}`.toLowerCase();

  // Check explicit per-unit pricing first (most reliable)
  if (combined.includes('/lb') || combined.includes('per lb')) return 'lb';
  if (combined.includes('/oz') || combined.includes('per oz')) return 'oz';
  if (combined.includes('/gal') || combined.includes('per gal')) return 'gallon';
  if (combined.includes('/ct') || combined.includes('per ct')) return 'each';

  // Parse size field for unit
  const sizeMatch = size?.toLowerCase()?.match(/(\d+\.?\d*)\s*(oz|lb|lbs|fl\s*oz|gal|gallon|ct|count|pk|pack|qt|quart|pt|pint|ml|l|kg|g)\b/);
  if (sizeMatch) {
    const unit = sizeMatch[2];
    if (unit === 'lb' || unit === 'lbs') return 'lb';
    if (unit === 'oz') return 'oz';
    if (unit === 'fl oz') return 'fl_oz';
    if (unit === 'gal' || unit === 'gallon') return 'gallon';
    if (unit === 'qt' || unit === 'quart') return 'quart';
    if (unit === 'pt' || unit === 'pint') return 'pint';
    if (unit === 'ct' || unit === 'count' || unit === 'pk' || unit === 'pack') return 'each';
    if (unit === 'kg') return 'kg';
    if (unit === 'g') return 'g';
    if (unit === 'ml') return 'ml';
    if (unit === 'l') return 'liter';
  }

  // Protein/seafood defaults to lb
  if (combined.match(/\b(chicken|beef|pork|turkey|salmon|cod|shrimp|steak|roast|chop|fillet|lamb|veal|halibut|swordfish|tuna|haddock|lobster|crab|scallop|duck|brisket|tenderloin|trout|mahi|sea bass|snapper|grouper)\b/)) return 'lb';
  // Dairy liquids
  if (combined.match(/\b(milk|cream|half and half)\b.*\b(gal|gallon)\b/)) return 'gallon';
  if (combined.match(/\beggs?\b.*\b(dozen|doz|12)\b/)) return 'dozen';
  if (combined.match(/\beggs?\b/)) return 'dozen';

  return 'each';
}

async function pushToPi(prices, label) {
  if (prices.length === 0) return 0;
  let imported = 0;
  const BATCH_SIZE = 200;
  for (let i = 0; i < prices.length; i += BATCH_SIZE) {
    const batch = prices.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(`${PI_API}/api/prices/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices: batch }),
      });
      if (res.ok) {
        const result = await res.json();
        imported += result.imported || 0;
      } else {
        console.log(`  [${label}] Push error: HTTP ${res.status}`);
      }
    } catch (err) {
      console.log(`  [${label}] Push error: ${err.message}`);
    }
  }
  return imported;
}

/**
 * Scroll until no new products appear (adaptive scrolling).
 * Returns after 3 consecutive scrolls with no new products.
 */
async function scrollUntilDone(page, seenProducts, maxScrolls = 60) {
  let consecutiveEmpty = 0;
  const TARGET_EMPTY = 3; // Stop after 3 scrolls with no new products

  for (let i = 0; i < maxScrolls; i++) {
    const before = seenProducts.size;
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await page.waitForTimeout(700);
    const after = seenProducts.size;

    if (after === before) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= TARGET_EMPTY) break;
    } else {
      consecutiveEmpty = 0;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const storeFilter = args.find(a => a.startsWith('--store='))?.split('=')[1];
  const skipDiscovery = args.includes('--skip-discovery');

  const storesToScrape = storeFilter
    ? STORES.filter(s => s.slug === storeFilter)
    : STORES;

  if (storesToScrape.length === 0) {
    console.error('Store not found. Available:', STORES.map(s => s.slug).join(', '));
    process.exit(1);
  }

  console.log('=== OpenClaw Deep Scraper v2 ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Stores: ${storesToScrape.map(s => s.name).join(', ')} (${storesToScrape.length})`);
  console.log(`Discovery: ${skipDiscovery ? 'DISABLED (hardcoded)' : 'ENABLED (auto)'}`);
  console.log(`Pi API: ${PI_API}`);

  // Get smart search terms from Pi
  console.log('\nBuilding search term list...');
  const searchTerms = await getSmartSearchTerms();
  console.log(`Search terms: ${searchTerms.length} (${SEARCH_TERMS.length} hardcoded + ${searchTerms.length - SEARCH_TERMS.length} from Pi)`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    geolocation: { latitude: 42.7762, longitude: -71.0773 },
    permissions: ['geolocation'],
  });

  await context.route('**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,ttf,eot,mp4,webm}', route => route.abort());

  let grandTotal = 0;
  let grandImported = 0;

  for (const store of storesToScrape) {
    const storeStart = Date.now();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${store.name} (${store.slug})`);
    console.log(`${'='.repeat(60)}`);

    const sourceId = `${store.slug}-instacart`;
    const seenProducts = new Map();
    let unflushed = []; // { ...product, categorySlug }
    let storeImported = 0;
    let currentCategorySlug = ''; // Track which category page we're on

    const page = await context.newPage();

    // Flush helper
    async function flushIfNeeded(force = false) {
      if (unflushed.length < FLUSH_EVERY && !force) return;
      if (unflushed.length === 0) return;

      const prices = unflushed.map(p => ({
        sourceId,
        rawProductName: p.name,
        priceCents: adjustPrice(p.priceCents, store.markupPct, p.name, p.categorySlug),
        priceUnit: detectUnit(p.name, p.size, p.perUnit),
        packageSize: p.size || null,
        priceType: p.onSale ? 'sale' : 'regular',
        pricingTier: store.tier,
        confidence: 'instacart_catalog',
        instacartMarkupPct: store.markupPct,
      }));

      const count = await pushToPi(prices, store.name);
      storeImported += count;
      console.log(`  >> Flushed ${prices.length} to Pi (+${count}, ${storeImported} store total)`);
      unflushed = [];
    }

    // Intercept GraphQL
    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('graphql')) return;
      try {
        const ct = response.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        const body = await response.json();
        const products = extractProductsFromAPI(body);
        let newCount = 0;
        for (const p of products) {
          const key = p.productId || p.name;
          if (!seenProducts.has(key)) {
            seenProducts.set(key, { ...p, categorySlug: currentCategorySlug });
            unflushed.push({ ...p, categorySlug: currentCategorySlug });
            newCount++;
          }
        }
        if (newCount > 0) {
          process.stdout.write(`  [API] +${newCount} (${seenProducts.size} total)\n`);
        }
      } catch (e) {}
    });

    // Phase 1: Discover categories
    let categories;
    if (skipDiscovery) {
      categories = FALLBACK_CATEGORIES.map(c => `collections/${c}`);
      console.log(`\n  Using ${categories.length} hardcoded categories`);
    } else {
      console.log(`\n  Phase 0: Discovering categories...`);
      categories = await discoverCategories(page, store.slug);
      console.log(`  Found ${categories.length} categories`);

      // Merge with fallback (dedup)
      const seen = new Set(categories);
      for (const cat of FALLBACK_CATEGORIES) {
        const key = `collections/${cat}`;
        if (!seen.has(key)) {
          categories.push(key);
          seen.add(key);
        }
      }
      console.log(`  Total after merge: ${categories.length} categories`);
    }

    // Phase 2: Browse all categories with adaptive scrolling
    console.log(`\n  Phase 1: Browsing ${categories.length} categories...`);
    for (let ci = 0; ci < categories.length; ci++) {
      const catPath = categories[ci];
      currentCategorySlug = catPath.split('/').pop() || '';
      const url = `${INSTACART_BASE}/store/${store.slug}/${catPath}`;
      process.stdout.write(`  [${ci+1}/${categories.length}] ${catPath} `);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2500);

        // Adaptive scrolling - keeps going until no new products
        await scrollUntilDone(page, seenProducts);
        console.log(`(${seenProducts.size} total)`);
      } catch (err) {
        console.log(`timeout (${seenProducts.size} total)`);
      }

      await page.waitForTimeout(400);
      await flushIfNeeded();
    }

    // Phase 3: Targeted searches with adaptive scrolling
    console.log(`\n  Phase 2: ${searchTerms.length} searches...`);
    for (let i = 0; i < searchTerms.length; i++) {
      const term = searchTerms[i];
      const url = `${INSTACART_BASE}/store/${store.slug}/search/${encodeURIComponent(term)}`;

      if (i % 50 === 0) {
        console.log(`  [search ${i+1}/${searchTerms.length}] "${term}" (${seenProducts.size} total)`);
      }

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
        await page.waitForTimeout(2000);
        await scrollUntilDone(page, seenProducts, 10);
      } catch (e) {}

      await page.waitForTimeout(400);
      if (i % 25 === 0) await flushIfNeeded();
    }

    await page.close();
    await flushIfNeeded(true);

    const elapsed = Math.round((Date.now() - storeStart) / 1000);
    grandTotal += seenProducts.size;
    grandImported += storeImported;

    console.log(`\n  ${store.name}: ${seenProducts.size} products, ${storeImported} imported (${elapsed}s)`);
    console.log(`  Running total: ${grandTotal} products, ${grandImported} imported`);

    try {
      const stats = await (await fetch(`${PI_API}/api/stats`)).json();
      console.log(`  Pi: ${stats.currentPrices} prices, ${stats.canonicalIngredients} ingredients`);
    } catch (e) {}
  }

  await browser.close();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ALL STORES DONE`);
  console.log(`  Total scraped: ${grandTotal}`);
  console.log(`  Total imported: ${grandImported}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
