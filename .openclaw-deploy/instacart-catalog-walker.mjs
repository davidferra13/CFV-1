/**
 * OpenClaw - Instacart Full Catalog Walker v3
 * Uses GET-based persisted queries (no Puppeteer required on Pi).
 *
 * Prerequisites:
 * - Session cookies captured from PC browser (captured-session.json or instacart-session.json)
 * - Run capture-instacart-v3.mjs on PC periodically to refresh cookies
 *
 * Strategy:
 * 1. Load session cookies from file
 * 2. Extract retailerInventorySessionToken from store page HTML
 * 3. Search via GET /graphql?operationName=SearchResultsPlacements with persisted query hash
 * 4. Get full item details via GET /graphql?operationName=Items
 * 5. Walk all search terms from config to build complete catalog
 *
 * Usage:
 *   node scrapers/instacart-catalog-walker.mjs market-basket [lat] [lng]
 */

import { getDb } from '../lib/db.mjs';
import {
  initCatalogSchema, upsertProduct, upsertStoreProduct,
  startScrapeRun, finishScrapeRun, getCatalogStats
} from '../lib/catalog-db.mjs';
import { sleep, randomUserAgent } from '../lib/scrape-utils.mjs';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSION_PATHS = [
  join(__dirname, '..', 'data', 'captured-session.json'),
  join(__dirname, '..', 'data', 'instacart-session.json'),
];

const INSTACART_BASE = 'https://www.instacart.com';

// Persisted query hashes (captured from Instacart JS client, March 2026)
const SEARCH_HASH = '95c5336c23ebbb52b5d5c63c28b0bb8ef1ae5adc191c334883b357a94701ff59';
const ITEMS_HASH = '5116339819ff07f207fd38f949a8a7f58e52cc62223b535405b087e3076ebf2f';

const INSTACART_CHAINS = {
  'market-basket': { chainSlug: 'market_basket', name: 'Market Basket', markupPct: 15, storeSlug: 'market-basket' },
  'hannaford': { chainSlug: 'hannaford', name: 'Hannaford', markupPct: 12, storeSlug: 'hannaford' },
  'stop-and-shop': { chainSlug: 'stop_and_shop', name: 'Stop & Shop', markupPct: 15, storeSlug: 'stop-and-shop' },
  'shaws': { chainSlug: 'shaws', name: "Shaw's", markupPct: 15, storeSlug: 'shaws' },
  'aldi': { chainSlug: 'aldi', name: 'Aldi', markupPct: 18, storeSlug: 'aldi' },
  'costco': { chainSlug: 'costco', name: 'Costco', markupPct: 20, storeSlug: 'costco' },
  'bjs-wholesale-club': { chainSlug: 'bjs', name: "BJ's", markupPct: 18, storeSlug: 'bjs-wholesale-club' },
  'whole-foods': { chainSlug: 'whole_foods', name: 'Whole Foods', markupPct: 10, storeSlug: 'whole-foods' },
};

const NON_FOOD_TERMS = new Set([
  'paper towels', 'toilet paper', 'trash bags', 'laundry', 'dish soap',
  'shampoo', 'toothpaste', 'deodorant', 'diapers', 'cat food', 'dog food',
]);

// ============================================================================
// SESSION
// ============================================================================

function loadSession() {
  for (const path of SESSION_PATHS) {
    try {
      if (!existsSync(path)) continue;
      const data = JSON.parse(readFileSync(path, 'utf8'));
      if (data.cookies) {
        console.log(`[session] Loaded from ${path.split('/').pop()}`);
        return data;
      }
    } catch {}
  }
  return null;
}

async function getSessionContext(session, storeSlug) {
  // Fetch the store page to get retailerInventorySessionToken, shopId, zoneId
  console.log('[session] Fetching store context...');
  const res = await fetch(`${INSTACART_BASE}/store/${storeSlug}/storefront`, {
    headers: {
      'User-Agent': session.ua || randomUserAgent(),
      'Accept': 'text/html',
      'Cookie': session.cookies,
    },
  });

  if (res.status !== 200) {
    console.error(`[session] Store page returned ${res.status}`);
    return null;
  }

  const html = await res.text();

  // Extract session token (URL-encoded format in the HTML)
  let sessionToken = '';
  const tokenMatch = html.match(/retailerInventorySessionToken%22%3A%22([^%"]+)/);
  if (tokenMatch) {
    sessionToken = decodeURIComponent(tokenMatch[1]);
  } else {
    const altMatch = html.match(/retailerInventorySessionToken["':\s]+"([^"]+)"/);
    if (altMatch) sessionToken = altMatch[1];
  }

  // Extract shopId
  const shopIdMatch = html.match(/shopId%22%3A%22(\d+)/) || html.match(/shopId["':\s]+"?(\d+)/);
  const shopId = shopIdMatch ? shopIdMatch[1] : '';

  // Extract zoneId
  const zoneIdMatch = html.match(/zoneId%22%3A%22(\d+)/) || html.match(/zoneId["':\s]+"?(\d+)/);
  const zoneId = zoneIdMatch ? zoneIdMatch[1] : '';

  // Update cookies from response
  const newCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  let updatedCookies = session.cookies;
  if (newCookies.length > 0) {
    updatedCookies += '; ' + newCookies.map(c => c.split(';')[0]).join('; ');
  }

  console.log(`[session] shopId=${shopId}, zoneId=${zoneId}, token=${sessionToken ? 'yes' : 'no'}`);

  return { sessionToken, shopId, zoneId, cookies: updatedCookies };
}

// ============================================================================
// GRAPHQL QUERIES (GET-based with persisted query hashes)
// ============================================================================

async function searchProducts(ctx, storeSlug, query, postalCode = '01835') {
  const variables = {
    filters: [],
    action: null,
    query,
    pageViewId: crypto.randomUUID(),
    retailerInventorySessionToken: ctx.sessionToken,
    elevatedProductId: null,
    searchSource: 'search',
    disableReformulation: false,
    disableLlm: false,
    forceInspiration: false,
    orderBy: 'bestMatch',
    clusterId: null,
    includeDebugInfo: false,
    clusteringStrategy: null,
    contentManagementSearchParams: { itemGridColumnCount: 6 },
    shopId: ctx.shopId,
    postalCode,
    zoneId: ctx.zoneId,
    first: 60,
  };

  const extensions = {
    persistedQuery: { version: 1, sha256Hash: SEARCH_HASH },
  };

  const params = new URLSearchParams({
    operationName: 'SearchResultsPlacements',
    variables: JSON.stringify(variables),
    extensions: JSON.stringify(extensions),
  });

  const url = `${INSTACART_BASE}/graphql?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': ctx.ua || randomUserAgent(),
      'Accept': 'application/json',
      'Cookie': ctx.cookies,
      'Referer': `${INSTACART_BASE}/store/${storeSlug}/search/${encodeURIComponent(query)}`,
    },
  });

  if (res.status === 429) {
    console.log('  [rate-limit] 60s wait...');
    await sleep(60000);
    return [];
  }

  if (res.status !== 200) {
    console.error(`  [search] HTTP ${res.status} for "${query}"`);
    return [];
  }

  const data = await res.json();
  return extractSearchProducts(data);
}

function extractSearchProducts(data) {
  const products = [];
  const seen = new Set();
  const placements = data.data?.searchResultsPlacements?.placements || [];

  for (const placement of placements) {
    const items = placement.content?.placement?.items || placement.content?.items || [];
    for (const item of items) {
      if (item.name == null) continue;
      const key = item.name.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      const vs = item.viewSection || {};
      const priceVs = item.price?.viewSection || {};

      // Price: item.price.viewSection.priceString or priceValueString
      const price = priceVs.priceString || priceVs.priceValueString || '';
      // Size: viewSection.itemString or price.viewSection.itemDetails.pricePerUnitString
      const size = (typeof vs.itemString === 'string' && vs.itemString !== 'Item') ? vs.itemString : '';
      // Image: viewSection.itemImage.templateUrl or itemTransparentImage
      const imgTemplate = vs.itemImage?.templateUrl || vs.itemTransparentImage?.templateUrl || '';
      const imageUrl = imgTemplate ? imgTemplate.replace('{width=}x{height=}', '200x200') : '';

      products.push({
        id: item.id || '',
        name: item.name,
        price,
        size,
        imageUrl,
        brand: '',
        inStock: true,
      });
    }
  }

  return products;
}

async function fetchItemDetails(ctx, itemIds) {
  if (itemIds.length === 0) return {};

  const variables = {
    ids: itemIds.slice(0, 30),  // Max 30 per request
    shopId: ctx.shopId,
    zoneId: ctx.zoneId,
    postalCode: '01835',
  };

  const extensions = {
    persistedQuery: { version: 1, sha256Hash: ITEMS_HASH },
  };

  const params = new URLSearchParams({
    operationName: 'Items',
    variables: JSON.stringify(variables),
    extensions: JSON.stringify(extensions),
  });

  const res = await fetch(`${INSTACART_BASE}/graphql?${params.toString()}`, {
    headers: {
      'User-Agent': ctx.ua || randomUserAgent(),
      'Accept': 'application/json',
      'Cookie': ctx.cookies,
    },
  });

  if (res.status !== 200) return {};

  const data = await res.json();
  const details = {};

  // Walk the response to find item details with prices
  function walk(obj, depth = 0) {
    if (depth > 10 || !obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (const item of obj) walk(item, depth + 1);
      return;
    }

    // Look for item objects with price info
    if (obj.id && obj.name && (obj.price || obj.pricing || obj.viewSection)) {
      const price = obj.viewSection?.itemImage?.price ||
        obj.price?.viewSection?.itemImage?.price || '';
      const size = obj.size || obj.viewSection?.itemString || '';
      const brand = obj.brandName || obj.brand || '';

      details[obj.id] = { price, size, brand };
    }

    for (const key of Object.keys(obj)) {
      walk(obj[key], depth + 1);
    }
  }

  walk(data);
  return details;
}

// ============================================================================
// PRODUCT PROCESSING
// ============================================================================

function parsePriceCents(priceStr) {
  if (!priceStr) return null;
  if (typeof priceStr === 'number') return Math.round(priceStr * 100);
  const match = String(priceStr).match(/\$?([\d,]+\.[\d]{2})/);
  if (match) return Math.round(parseFloat(match[1].replace(',', '')) * 100);
  return null;
}

function adjustForMarkup(priceCents, markupPct) {
  return Math.round(priceCents / (1 + markupPct / 100));
}

function parseSize(sizeStr) {
  if (!sizeStr || sizeStr === 'Item') return { value: null, unit: null };
  const match = sizeStr.match(/([\d.]+)\s*(oz|lb|fl oz|gal|ct|pk|ml|l|kg|g|each|ea)/i);
  return match ? { value: parseFloat(match[1]), unit: match[2].toLowerCase() } : { value: null, unit: null };
}

function isOrganic(name) { return /\borganic\b/i.test(name); }

function isStoreBrand(name, brand) {
  const storeBrands = ['market basket', 'bowl & basket', 'good & gather', 'great value',
    'hannaford', "nature's promise", 'simply nature', '365', 'essential everyday'];
  const check = (brand || name).toLowerCase();
  return storeBrands.some(b => check.includes(b));
}

function guessCategory(searchTerm) {
  const map = {
    'produce': ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'potato', 'onion', 'carrot', 'broccoli', 'pepper', 'avocado', 'berries', 'grapes', 'lemon', 'lime', 'celery', 'cucumber', 'spinach', 'kale', 'mushroom', 'corn', 'squash', 'garlic', 'ginger', 'herbs', 'cilantro', 'parsley', 'basil', 'mint', 'strawberry', 'blueberry', 'raspberry', 'mango', 'pineapple', 'watermelon', 'cantaloupe', 'peach', 'plum', 'pear', 'cherry', 'fig', 'pomegranate', 'coconut', 'plantain', 'kiwi', 'grapefruit', 'tangerine', 'clementine', 'cranberry', 'nectarine', 'papaya', 'dragon fruit', 'persimmon', 'guava', 'apricot', 'sweet potato', 'shallot', 'leek', 'scallion', 'cauliflower', 'cabbage', 'brussels', 'arugula', 'romaine', 'mixed greens', 'zucchini', 'butternut', 'pumpkin', 'asparagus', 'green bean', 'snap pea', 'edamame', 'eggplant', 'artichoke', 'fennel', 'turnip', 'parsnip', 'radish', 'beet', 'turmeric', 'bok choy', 'bean sprout', 'watercress', 'okra', 'jicama', 'tomatillo', 'chayote', 'daikon', 'collard', 'swiss chard', 'endive', 'radicchio', 'kohlrabi', 'dill', 'rosemary', 'thyme', 'sage', 'oregano fresh', 'chive', 'tarragon', 'lemongrass', 'bay leaf'],
    'dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs', 'sour cream', 'cottage cheese', 'kefir', 'mascarpone', 'ricotta', 'mozzarella', 'parmesan', 'cheddar', 'swiss cheese', 'provolone', 'gouda', 'brie', 'goat cheese', 'feta', 'blue cheese', 'gruyere', 'american cheese', 'pepper jack', 'monterey jack', 'colby', 'string cheese', 'half and half', 'whipping cream', 'eggnog', 'chocolate milk', 'buttermilk', 'whipped cream'],
    'meat': ['chicken', 'beef', 'pork', 'turkey', 'steak', 'ground beef', 'ground turkey', 'ground chicken', 'sausage', 'bacon', 'ham', 'lamb', 'duck', 'veal', 'hot dog', 'hamburger', 'ribs', 'brisket', 'tenderloin', 'roast', 'prosciutto', 'pancetta', 'salami', 'pepperoni', 'chorizo', 'bratwurst', 'kielbasa', 'corned beef', 'liver', 'oxtail', 'deli turkey', 'deli roast beef', 'deli chicken'],
    'seafood': ['salmon', 'shrimp', 'tuna', 'cod', 'tilapia', 'crab', 'lobster', 'fish', 'halibut', 'swordfish', 'mahi', 'sea bass', 'scallop', 'clam', 'mussel', 'oyster', 'calamari', 'squid', 'sardine', 'anchovy', 'catfish', 'trout', 'haddock', 'pollock', 'lox', 'smoked salmon', 'smoked fish'],
    'bakery': ['bread', 'rolls', 'bagels', 'muffin', 'cake', 'pie', 'cookie', 'tortilla', 'croissant', 'danish', 'scone', 'cinnamon roll', 'donut', 'cupcake', 'brownie', 'baguette', 'ciabatta', 'sourdough', 'pita', 'naan', 'english muffin', 'hamburger bun', 'hot dog bun', 'brioche', 'wrap', 'lavash', 'flatbread', 'rye bread', 'pumpernickel', 'french bread'],
    'frozen': ['frozen', 'ice cream', 'gelato', 'sorbet', 'sherbet', 'popsicle', 'eggo', 'hot pocket', 'lean cuisine', 'stouffers', 'banquet', 'digiorno', 'red baron', 'totinos', 'frozen pizza', 'frozen fries', 'tater tots', 'frozen waffle', 'frozen pancake', 'frozen dinner', 'frozen burrito', 'frozen dumpling', 'frozen pierogi', 'frozen fish stick', 'frozen nugget', 'frozen vegetable', 'cool whip'],
    'pantry': ['rice', 'pasta', 'flour', 'sugar', 'oil', 'vinegar', 'salt', 'beans', 'canned', 'soup', 'cereal', 'oatmeal', 'peanut butter', 'jelly', 'honey', 'syrup', 'sauce', 'ketchup', 'mustard', 'mayo', 'salad dressing', 'soy sauce', 'tamari', 'fish sauce', 'worcestershire', 'hot sauce', 'sriracha', 'barbecue sauce', 'teriyaki', 'hoisin', 'pesto', 'marinara', 'alfredo', 'salsa', 'tomato paste', 'broth', 'stock', 'lentils', 'chickpeas', 'coconut milk', 'olive oil', 'sesame oil', 'avocado oil', 'balsamic', 'cornstarch', 'cornmeal', 'quinoa', 'couscous', 'farro', 'barley', 'polenta', 'noodle', 'spaghetti', 'penne', 'linguine', 'macaroni', 'orzo', 'ramen'],
    'beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'energy drink', 'sports drink', 'gatorade', 'coca cola', 'pepsi', 'sprite', 'mountain dew', 'dr pepper', 'la croix', 'perrier', 'kombucha', 'celsius', 'red bull', 'monster', 'snapple', 'arizona', 'lemonade', 'sparkling water', 'ginger ale', 'tonic', 'club soda', 'vitamin water', 'keurig', 'k cup', 'creamer', 'espresso', 'nespresso'],
    'snacks': ['chips', 'crackers', 'nuts', 'popcorn', 'pretzels', 'trail mix', 'granola bar', 'protein bar', 'doritos', 'lays', 'cheetos', 'pringles', 'goldfish', 'cheez it', 'wheat thins', 'ritz', 'rice cake', 'veggie straw', 'hummus', 'guacamole', 'dip', 'beef jerky', 'slim jim', 'fruit snack', 'pop tart', 'kind bar', 'clif bar'],
    'candy': ['chocolate', 'candy', 'gummy', 'reese', 'snickers', 'm&m', 'kit kat', 'twix', 'hershey', 'skittles', 'starburst', 'sour patch', 'twizzler', 'gum', 'mint', 'altoids', 'lindt', 'ghirardelli', 'truffle', 'caramel', 'toffee'],
    'breakfast': ['cheerios', 'frosted flakes', 'corn flakes', 'fruit loops', 'lucky charms', 'raisin bran', 'special k', 'cinnamon toast', 'rice krispies', 'cocoa puffs', 'wheaties', 'chex', 'muesli', 'shredded wheat', 'pancake mix', 'waffle mix', 'nutri grain'],
    'deli': ['deli', 'rotisserie', 'chicken salad', 'tuna salad', 'egg salad', 'coleslaw', 'potato salad', 'macaroni salad', 'pasta salad', 'sushi', 'sub roll', 'hoagie', 'kaiser roll', 'dinner roll', 'olive bar', 'antipasto'],
    'baking': ['baking soda', 'baking powder', 'yeast', 'cream of tartar', 'chocolate chips', 'cocoa powder', 'vanilla extract', 'almond extract', 'food coloring', 'gelatin', 'sprinkles', 'pie crust', 'puff pastry', 'phyllo', 'cake mix', 'brownie mix', 'frosting', 'marshmallow', 'graham cracker', 'almond flour', 'coconut flour', 'breadcrumb', 'panko'],
    'spices': ['cumin', 'chili powder', 'cayenne', 'paprika', 'cinnamon', 'nutmeg', 'clove', 'cardamom', 'turmeric powder', 'coriander', 'curry powder', 'garam masala', 'italian seasoning', 'taco seasoning', 'everything bagel seasoning', 'saffron', 'star anise', 'sumac', 'zaatar', 'black pepper', 'white pepper', 'garlic powder', 'onion powder', 'red pepper flake'],
    'international': ['rice paper', 'wonton', 'dumpling wrapper', 'miso', 'nori', 'seaweed', 'wasabi', 'gochujang', 'curry paste', 'soba', 'udon', 'pad thai', 'glass noodle', 'furikake', 'masa harina', 'queso fresco', 'cotija', 'chipotle', 'ancho', 'guajillo', 'mole', 'enchilada sauce', 'refried beans', 'hominy', 'yuca', 'parmigiano reggiano', 'pecorino', 'gorgonzola', 'san marzano', 'gnocchi', 'arborio', 'truffle oil', 'falafel', 'tzatziki', 'naan bread', 'papadum', 'chutney', 'tikka masala', 'kimchi', 'harissa', 'matzo', 'challah'],
    'baby': ['baby food', 'baby formula', 'similac', 'enfamil', 'baby cereal', 'baby puffs', 'gerber', 'happy baby', 'baby wipes', 'diapers', 'pull ups'],
    'pet': ['dog food', 'cat food', 'dog treat', 'cat treat', 'cat litter', 'purina', 'blue buffalo', 'iams', 'pedigree', 'meow mix'],
    'household': ['dish soap', 'dishwasher', 'laundry detergent', 'tide', 'fabric softener', 'dryer sheet', 'bleach', 'clorox', 'lysol', 'windex', 'mr clean', 'sponge', 'paper towel', 'napkin', 'toilet paper', 'trash bag', 'garbage bag', 'ziplock', 'aluminum foil', 'plastic wrap', 'wax paper', 'parchment paper', 'freezer bag', 'charmin', 'bounty', 'kleenex'],
    'personal_care': ['shampoo', 'conditioner', 'body wash', 'bar soap', 'hand soap', 'toothpaste', 'toothbrush', 'mouthwash', 'dental floss', 'deodorant', 'razor', 'shaving cream', 'lotion', 'sunscreen', 'lip balm', 'band aid', 'tylenol', 'advil', 'ibuprofen', 'allergy medicine', 'vitamin', 'multivitamin', 'fish oil', 'probiotic'],
    'alcohol': ['beer', 'ipa', 'lager', 'ale', 'stout', 'sam adams', 'budweiser', 'corona', 'heineken', 'hard seltzer', 'white claw', 'truly', 'wine', 'prosecco', 'champagne', 'bourbon', 'whiskey', 'vodka', 'rum', 'tequila', 'gin', 'cooking wine', 'mirin', 'sherry'],
  };

  const term = searchTerm.toLowerCase();
  for (const [category, terms] of Object.entries(map)) {
    if (terms.some(t => term.includes(t))) return category;
  }
  return 'other';
}

function safeStr(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return null;
}

function processAndStore(db, storeId, product, markupPct, searchTerm) {
  const priceCents = parsePriceCents(product.price);
  if (!priceCents || priceCents <= 0 || priceCents > 500000) return null;

  const adjustedPrice = adjustForMarkup(priceCents, markupPct);
  const sizeStr = safeStr(product.size);
  const { value: sizeValue, unit: sizeUnit } = parseSize(sizeStr);
  const isFood = !NON_FOOD_TERMS.has(searchTerm);
  const category = guessCategory(searchTerm);
  const nameStr = safeStr(product.name) || 'Unknown';
  const brandStr = safeStr(product.brand);
  const imageStr = safeStr(product.imageUrl);

  const prodResult = upsertProduct(db, {
    name: nameStr,
    brand: brandStr || null,
    upc: null,
    size: (sizeStr && sizeStr !== 'Item') ? sizeStr : null,
    sizeValue, sizeUnit,
    category: category.charAt(0).toUpperCase() + category.slice(1),
    department: category.charAt(0).toUpperCase() + category.slice(1),
    isFood,
    imageUrl: imageStr || null,
    isOrganic: isOrganic(nameStr),
    isStoreBrand: isStoreBrand(nameStr, brandStr),
  });

  const priceResult = upsertStoreProduct(db, {
    storeId,
    productId: prodResult.id,
    priceCents: adjustedPrice,
    salePriceCents: null,
    inStock: product.inStock !== false,
    source: 'instacart',
  });

  return { productIsNew: prodResult.isNew, priceResult };
}

// ============================================================================
// SEARCH TERMS
// ============================================================================

function loadSearchTerms() {
  const configPath = join(__dirname, '..', 'config', 'search-terms.json');
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const allTerms = [];
    for (const category of Object.values(config.terms)) {
      allTerms.push(...category);
    }
    return allTerms;
  } catch {
    return [
      // Core grocery categories
      'milk', 'eggs', 'bread', 'butter', 'cheese', 'yogurt', 'cream cheese',
      'chicken breast', 'ground beef', 'pork chops', 'salmon', 'shrimp', 'bacon', 'sausage',
      'rice', 'pasta', 'flour', 'sugar', 'olive oil', 'vegetable oil',
      'apple', 'banana', 'orange', 'strawberry', 'blueberry', 'grapes', 'avocado',
      'lettuce', 'tomato', 'potato', 'onion', 'carrot', 'broccoli', 'pepper', 'garlic',
      'cereal', 'oatmeal', 'granola', 'peanut butter', 'jelly',
      'chips', 'crackers', 'cookies', 'ice cream', 'frozen pizza',
      'coffee', 'tea', 'juice', 'water', 'soda',
      'ketchup', 'mustard', 'mayo', 'salad dressing', 'soy sauce',
      'canned beans', 'canned tomatoes', 'soup', 'tuna canned',
      'tortillas', 'bagels', 'english muffins',
    ];
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('=== OpenClaw Instacart Catalog Walker v3 (GET API) ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const args = process.argv.slice(2);
  const instacartSlug = args[0];

  if (!instacartSlug) {
    console.log('Usage: node instacart-catalog-walker.mjs <instacart-slug> [lat] [lng]');
    console.log('  Slugs: ' + Object.keys(INSTACART_CHAINS).join(', '));
    process.exit(0);
  }

  const chainConfig = INSTACART_CHAINS[instacartSlug];
  if (!chainConfig) {
    console.error(`Unknown slug: ${instacartSlug}. Available: ${Object.keys(INSTACART_CHAINS).join(', ')}`);
    process.exit(1);
  }

  const lat = parseFloat(args[1]) || 42.7762;
  const lng = parseFloat(args[2]) || -71.0773;

  console.log(`Chain: ${chainConfig.name}`);
  console.log(`Markup: ${chainConfig.markupPct}%`);

  // Load session
  const session = loadSession();
  if (!session) {
    console.error('No session found. Run capture-instacart-v3.mjs on PC first.');
    process.exit(1);
  }

  // Get store context
  const ctx = await getSessionContext(session, chainConfig.storeSlug);
  if (!ctx || !ctx.sessionToken) {
    console.error('Could not get session context. Session may be expired.');
    process.exit(1);
  }
  ctx.ua = session.ua || randomUserAgent();

  // Init DB
  const db = getDb();
  initCatalogSchema(db);

  // Find nearest store
  const store = db.prepare(`
    SELECT id, name, city, state FROM catalog_stores
    WHERE chain_slug = ? AND lat IS NOT NULL
    ORDER BY ABS(lat - ?) + ABS(lng - ?) ASC LIMIT 1
  `).get(chainConfig.chainSlug, lat, lng);

  let storeId;
  if (store) {
    storeId = store.id;
    console.log(`Store: ${store.name}, ${store.city}, ${store.state} (id=${store.id})`);
  } else {
    const result = db.prepare(`
      INSERT INTO catalog_stores (chain_slug, external_store_id, name, city, state, zip, lat, lng)
      VALUES (?, ?, ?, 'Unknown', 'MA', '00000', ?, ?)
    `).run(chainConfig.chainSlug, `instacart-${instacartSlug}`, chainConfig.name, lat, lng);
    storeId = result.lastInsertRowid;
  }

  const runId = startScrapeRun(db, {
    storeId, chainSlug: chainConfig.chainSlug,
    scraperName: 'instacart-catalog-walker-v3', scope: 'full',
  });

  let totalProducts = 0, totalNew = 0, totalChanged = 0, totalErrors = 0;

  // Load search terms
  const searchTerms = loadSearchTerms();
  console.log(`\nSearch terms: ${searchTerms.length}`);

  // Walk all search terms
  for (let i = 0; i < searchTerms.length; i++) {
    const term = searchTerms[i];
    try {
      const products = await searchProducts(ctx, chainConfig.storeSlug, term);

      // Enrich with Items query if we got products
      if (products.length > 0) {
        const ids = products.map(p => p.id).filter(Boolean);
        if (ids.length > 0) {
          try {
            const details = await fetchItemDetails(ctx, ids);
            for (const product of products) {
              const detail = details[product.id];
              if (detail) {
                if (!product.price && detail.price) product.price = detail.price;
                if (detail.brand) product.brand = detail.brand;
                if (detail.size && detail.size !== 'Item') product.size = detail.size;
              }
            }
          } catch {}
        }
      }

      let termNew = 0;
      for (const product of products) {
        const result = processAndStore(db, storeId, product, chainConfig.markupPct, term);
        if (!result) continue;
        totalProducts++;
        if (result.productIsNew) { totalNew++; termNew++; }
        if (result.priceResult === 'changed') totalChanged++;
      }

      // Progress logging
      if (i % 10 === 0 || termNew > 5) {
        console.log(`  [${i}/${searchTerms.length}] "${term}" | found:${products.length} new:${termNew} | total:${totalProducts} (${totalNew} new)`);
      }
    } catch (err) {
      console.error(`  [${term}] Error: ${err.message}`);
      totalErrors++;
    }

    // Rate limiting: 2-4 second delays
    await sleep(2000 + Math.random() * 2000);

    // Cooldown every 30 terms
    if (i > 0 && i % 30 === 0) {
      console.log('  [cooldown] 15s...');
      await sleep(15000);
    }
  }

  // Update store
  db.prepare("UPDATE catalog_stores SET last_cataloged_at = datetime('now') WHERE id = ?").run(storeId);

  finishScrapeRun(db, runId, {
    productsFound: totalProducts,
    productsNew: totalNew,
    productsUpdated: totalChanged,
    errors: totalErrors,
  });

  const stats = getCatalogStats(db);
  console.log(`\n=== Complete ===`);
  console.log(`Products: ${totalProducts} (${totalNew} new, ${totalChanged} changed, ${totalErrors} errors)`);
  console.log(`Catalog: ${stats.products} products, ${stats.storeProducts} prices, ${stats.stores} stores`);

  // Department breakdown
  const byDept = db.prepare('SELECT department, COUNT(*) as c FROM catalog_products GROUP BY department ORDER BY c DESC LIMIT 15').all();
  console.log('\nBy department:');
  byDept.forEach(d => console.log(`  ${d.department}: ${d.c}`));
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
