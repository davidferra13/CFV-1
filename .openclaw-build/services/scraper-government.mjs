/**
 * OpenClaw Price Intelligence - Government API Scraper
 * Fetches food price data from BLS, FRED, and USDA APIs.
 * These are the ground truth: free, reliable, never blocked.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb, upsertPrice } from '../lib/db.mjs';
import { normalizeByRules, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', 'config', '.env');

// Load env manually (no dotenv needed for simplicity)
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const [key, ...rest] = trimmed.split('=');
  env[key.trim()] = rest.join('=').trim();
}

const BLS_API_KEY = env.BLS_API_KEY;
const FRED_API_KEY = env.FRED_API_KEY;
const USDA_API_KEY = env.USDA_API_KEY;

const BLS_SOURCE_ID = 'gov-bls-northeast';
const FRED_SOURCE_ID = 'gov-fred';
const USDA_SOURCE_ID = 'gov-usda-ams';

// BLS Average Price series IDs for food items (Northeast region)
// APU02 = Northeast urban, then item code
const BLS_FOOD_SERIES = [
  { seriesId: 'APU0200703112', name: 'Flour, white, all purpose, per lb', ingredientId: 'flour-all-purpose', unit: 'lb' },
  { seriesId: 'APU0200703213', name: 'Rice, white, long grain, per lb', ingredientId: 'rice-white-long', unit: 'lb' },
  { seriesId: 'APU0200704111', name: 'Bread, white, pan, per lb', ingredientId: 'bread-white', unit: 'lb' },
  { seriesId: 'APU0200704212', name: 'Bread, whole wheat, pan, per lb', ingredientId: 'bread-whole-wheat', unit: 'lb' },
  { seriesId: 'APU0200705111', name: 'Spaghetti and macaroni, per lb', ingredientId: 'pasta-spaghetti', unit: 'lb' },
  { seriesId: 'APU0200706111', name: 'Ground chuck, 100% beef, per lb', ingredientId: 'beef-ground', unit: 'lb' },
  { seriesId: 'APU0200706211', name: 'Ground beef, 100% beef, per lb', ingredientId: 'beef-ground', unit: 'lb' },
  { seriesId: 'APU0200706212', name: 'Chuck roast, USDA Choice, boneless, per lb', ingredientId: 'beef-chuck', unit: 'lb' },
  { seriesId: 'APU0200706213', name: 'Round roast, USDA Choice, boneless, per lb', ingredientId: 'beef-round-roast', unit: 'lb' },
  { seriesId: 'APU0200706311', name: 'Steak, sirloin, USDA Choice, boneless, per lb', ingredientId: 'beef-sirloin', unit: 'lb' },
  { seriesId: 'APU0200706312', name: 'Steak, round, USDA Choice, boneless, per lb', ingredientId: 'beef-round-steak', unit: 'lb' },
  { seriesId: 'APU0200706411', name: 'Beef for stew, boneless, per lb', ingredientId: 'beef-stew-meat', unit: 'lb' },
  { seriesId: 'APU0200707111', name: 'Bacon, sliced, per lb', ingredientId: 'bacon', unit: 'lb' },
  { seriesId: 'APU0200707211', name: 'Chops, center cut, bone-in, per lb', ingredientId: 'pork-chops', unit: 'lb' },
  { seriesId: 'APU0200707311', name: 'Ham, boneless, exc canned, per lb', ingredientId: 'ham-boneless', unit: 'lb' },
  { seriesId: 'APU0200707411', name: 'Pork sausage, fresh, loose, per lb', ingredientId: 'sausage', unit: 'lb' },
  { seriesId: 'APU0200708111', name: 'Chicken, fresh, whole, per lb', ingredientId: 'chicken-whole', unit: 'lb' },
  { seriesId: 'APU0200708112', name: 'Chicken breast, bone-in, per lb', ingredientId: 'chicken-breast-bone-in', unit: 'lb' },
  { seriesId: 'APU0200708113', name: 'Chicken legs, bone-in, per lb', ingredientId: 'chicken-legs', unit: 'lb' },
  { seriesId: 'APU0200709112', name: 'Tuna, chunk light, canned, per lb', ingredientId: 'tuna-canned', unit: 'lb' },
  { seriesId: 'APU0200710111', name: 'Eggs, grade A, large, per doz.', ingredientId: 'eggs-large', unit: 'dozen' },
  { seriesId: 'APU0200710211', name: 'Milk, fresh, whole, fortified, per gal.', ingredientId: 'milk-whole', unit: 'gallon' },
  { seriesId: 'APU0200710212', name: 'Milk, fresh, low fat (2%), per gal.', ingredientId: 'milk-2pct', unit: 'gallon' },
  { seriesId: 'APU0200710411', name: 'Butter, salted, grade AA, stick, per lb.', ingredientId: 'butter-salted', unit: 'lb' },
  { seriesId: 'APU0200710511', name: 'American processed cheese, per lb.', ingredientId: 'cheese-american', unit: 'lb' },
  { seriesId: 'APU0200710611', name: 'Cheddar cheese, natural, per lb.', ingredientId: 'cheese-cheddar', unit: 'lb' },
  { seriesId: 'APU0200711111', name: 'Apples, Red Delicious, per lb.', ingredientId: 'apple', unit: 'lb' },
  { seriesId: 'APU0200711211', name: 'Bananas, per lb.', ingredientId: 'banana', unit: 'lb' },
  { seriesId: 'APU0200711311', name: 'Oranges, Navel, per lb.', ingredientId: 'orange', unit: 'lb' },
  { seriesId: 'APU0200711411', name: 'Strawberries, dry pint, per 12 oz.', ingredientId: 'strawberries', unit: '12oz' },
  { seriesId: 'APU0200711412', name: 'Grapes, Thompson Seedless, per lb.', ingredientId: 'grapes', unit: 'lb' },
  { seriesId: 'APU0200711413', name: 'Lemons, per lb.', ingredientId: 'lemon', unit: 'lb' },
  { seriesId: 'APU0200712111', name: 'Lettuce, iceberg, per lb.', ingredientId: 'lettuce-iceberg', unit: 'lb' },
  { seriesId: 'APU0200712211', name: 'Tomatoes, field grown, per lb.', ingredientId: 'tomato', unit: 'lb' },
  { seriesId: 'APU0200712311', name: 'Broccoli, per lb.', ingredientId: 'broccoli', unit: 'lb' },
  { seriesId: 'APU0200712401', name: 'Peppers, sweet, per lb.', ingredientId: 'bell-pepper-red', unit: 'lb' },
  { seriesId: 'APU0200712406', name: 'Potatoes, white, per lb.', ingredientId: 'potato-russet', unit: 'lb' },
  { seriesId: 'APU0200712407', name: 'Carrots, short trimmed, per lb.', ingredientId: 'carrot', unit: 'lb' },
  { seriesId: 'APU0200712408', name: 'Celery, per lb.', ingredientId: 'celery', unit: 'lb' },
  { seriesId: 'APU0200713111', name: 'Sugar, white, all sizes, per lb.', ingredientId: 'sugar-granulated', unit: 'lb' },
  { seriesId: 'APU0200714233', name: 'Peanut butter, creamy, all sizes, per lb.', ingredientId: 'peanut-butter', unit: 'lb' },
  { seriesId: 'APU0200717311', name: 'Coffee, 100%, ground roast, all sizes, per lb.', ingredientId: 'coffee-ground', unit: 'lb' },
];

/**
 * Fetch data from BLS API v2.
 * API docs: https://www.bls.gov/developers/api_signature_v2.htm
 */
async function fetchBLS() {
  console.log('[BLS] Fetching average price data for Northeast region...');

  const seriesIds = BLS_FOOD_SERIES.map(s => s.seriesId);
  const currentYear = new Date().getFullYear();

  // BLS API v2 allows up to 50 series per request
  const results = [];
  const batchSize = 25;

  for (let i = 0; i < seriesIds.length; i += batchSize) {
    const batch = seriesIds.slice(i, i + batchSize);

    const body = JSON.stringify({
      seriesid: batch,
      startyear: String(currentYear - 1),
      endyear: String(currentYear),
      registrationkey: BLS_API_KEY
    });

    try {
      const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (!res.ok) {
        console.error(`[BLS] HTTP ${res.status}: ${res.statusText}`);
        continue;
      }

      const json = await res.json();

      if (json.status !== 'REQUEST_SUCCEEDED') {
        console.error('[BLS] API error:', json.message);
        continue;
      }

      for (const series of json.Results.series) {
        const seriesConfig = BLS_FOOD_SERIES.find(s => s.seriesId === series.seriesID);
        if (!seriesConfig) continue;

        // Get the most recent data point
        const latest = series.data?.[0]; // data is sorted newest first
        if (!latest || !latest.value || latest.value === '-') {
          console.warn(`  [BLS] No data for ${series.seriesID} (${seriesConfig.name})`);
          continue;
        }

        const price = parseFloat(latest.value);
        if (isNaN(price) || price <= 0) continue;

        results.push({
          seriesId: series.seriesID,
          ingredientId: seriesConfig.ingredientId,
          name: seriesConfig.name,
          unit: seriesConfig.unit,
          price,
          priceCents: Math.round(price * 100),
          period: `${latest.year}-${latest.period}`, // e.g., "2026-M02"
          year: latest.year,
          periodName: latest.periodName
        });
      }

      console.log(`[BLS] Batch ${Math.floor(i / batchSize) + 1}: fetched ${batch.length} series`);

      // Rate limiting: wait between batches
      if (i + batchSize < seriesIds.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error(`[BLS] Fetch error for batch ${Math.floor(i / batchSize) + 1}:`, err.message);
    }
  }

  console.log(`[BLS] Total: ${results.length} prices fetched`);
  return results;
}

/**
 * Fetch data from FRED API.
 * We use specific food CPI series for trend/inflation tracking.
 */
async function fetchFRED() {
  console.log('[FRED] Fetching food CPI data...');

  // Key FRED series for food price tracking
  const fredSeries = [
    { id: 'APU0200708111', name: 'Chicken whole (Northeast)', ingredientId: 'chicken-whole', unit: 'lb' },
    { id: 'CUSR0000SAF112', name: 'Food at home CPI (all items)', ingredientId: null, unit: 'index' },
    { id: 'CUSR0000SAF1111', name: 'Cereals and bakery CPI', ingredientId: null, unit: 'index' },
    { id: 'CUSR0000SETB', name: 'Meats poultry fish eggs CPI', ingredientId: null, unit: 'index' },
    { id: 'CUSR0000SEFJ', name: 'Eggs CPI', ingredientId: null, unit: 'index' },
    { id: 'CUSR0000SEFG', name: 'Dairy and related CPI', ingredientId: null, unit: 'index' },
    { id: 'CUSR0000SAF113', name: 'Fruits and vegetables CPI', ingredientId: null, unit: 'index' },
  ];

  const results = [];

  for (const series of fredSeries) {
    try {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error(`[FRED] HTTP ${res.status} for ${series.id}`);
        continue;
      }

      const json = await res.json();
      const obs = json.observations?.[0];
      if (!obs || obs.value === '.') continue;

      results.push({
        seriesId: series.id,
        name: series.name,
        ingredientId: series.ingredientId,
        unit: series.unit,
        value: parseFloat(obs.value),
        date: obs.date
      });

      // Rate limiting
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`[FRED] Fetch error for ${series.id}:`, err.message);
    }
  }

  console.log(`[FRED] Total: ${results.length} data points fetched`);
  return results;
}

/**
 * Store BLS results in the database.
 */
function storeBLSResults(db, results) {
  let newCount = 0, changedCount = 0, unchangedCount = 0;

  for (const item of results) {
    const result = upsertPrice(db, {
      sourceId: BLS_SOURCE_ID,
      canonicalIngredientId: item.ingredientId,
      variantId: null,
      rawProductName: item.name,
      priceCents: item.priceCents,
      priceUnit: item.unit,
      pricePerStandardUnitCents: item.priceCents, // BLS already reports per standard unit
      standardUnit: item.unit,
      packageSize: null,
      priceType: 'regular',
      pricingTier: 'retail',
      confidence: 'government_baseline',
      instacartMarkupPct: null,
      sourceUrl: `https://data.bls.gov/timeseries/${item.seriesId}`,
      saleDates: null
    });

    if (result === 'new') newCount++;
    else if (result === 'changed') changedCount++;
    else unchangedCount++;
  }

  console.log(`[BLS->DB] New: ${newCount}, Changed: ${changedCount}, Unchanged: ${unchangedCount}`);
}

/**
 * Ensure government sources exist in the registry.
 */
function ensureSourcesExist(db) {
  const sources = [
    {
      source_id: BLS_SOURCE_ID,
      name: 'Bureau of Labor Statistics (Northeast)',
      type: 'government',
      scrape_method: 'government_api',
      pricing_tier: 'retail',
      status: 'active',
      website: 'https://www.bls.gov/cpi/factsheets/average-prices.htm',
      notes: 'BLS Average Price Data for Northeast urban region. ~70 food items. Monthly updates.'
    },
    {
      source_id: FRED_SOURCE_ID,
      name: 'Federal Reserve Economic Data (FRED)',
      type: 'government',
      scrape_method: 'government_api',
      pricing_tier: 'retail',
      status: 'active',
      website: 'https://fred.stlouisfed.org/',
      notes: 'FRED food CPI series. Inflation tracking and trend data.'
    },
    {
      source_id: USDA_SOURCE_ID,
      name: 'USDA Agricultural Marketing Service',
      type: 'government',
      scrape_method: 'government_api',
      pricing_tier: 'wholesale',
      status: 'active',
      website: 'https://www.ers.usda.gov/data-products/food-price-outlook/',
      notes: 'USDA food price outlook and terminal market data.'
    }
  ];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO source_registry (source_id, name, type, scrape_method, pricing_tier, status, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of sources) {
    insert.run(s.source_id, s.name, s.type, s.scrape_method, s.pricing_tier, s.status, s.website, s.notes);
  }
}

/**
 * Ensure canonical ingredients exist for all BLS items.
 */
function ensureCanonicalIngredients(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit)
    VALUES (?, ?, ?, ?)
  `);

  // All the ingredient IDs referenced in BLS_FOOD_SERIES plus common ones
  const ingredients = [
    // Grains
    ['flour-all-purpose', 'All-Purpose Flour', 'grains', 'lb'],
    ['rice-white-long', 'White Rice, Long Grain', 'grains', 'lb'],
    ['rice-basmati', 'Basmati Rice', 'grains', 'lb'],
    ['rice-jasmine', 'Jasmine Rice', 'grains', 'lb'],
    ['rice-arborio', 'Arborio Rice', 'grains', 'lb'],
    ['bread-white', 'White Bread', 'grains', 'lb'],
    ['bread-whole-wheat', 'Whole Wheat Bread', 'grains', 'lb'],
    ['pasta-spaghetti', 'Spaghetti', 'grains', 'lb'],
    ['pasta-penne', 'Penne Pasta', 'grains', 'lb'],
    ['pasta', 'Pasta', 'grains', 'lb'],
    ['breadcrumbs', 'Breadcrumbs', 'grains', 'lb'],
    ['panko', 'Panko Breadcrumbs', 'grains', 'lb'],

    // Beef
    ['beef-ground', 'Ground Beef', 'beef', 'lb'],
    ['beef-chuck', 'Chuck Roast', 'beef', 'lb'],
    ['beef-round-roast', 'Round Roast', 'beef', 'lb'],
    ['beef-sirloin', 'Sirloin Steak', 'beef', 'lb'],
    ['beef-round-steak', 'Round Steak', 'beef', 'lb'],
    ['beef-ribeye', 'Ribeye Steak', 'beef', 'lb'],
    ['beef-tenderloin', 'Beef Tenderloin', 'beef', 'lb'],
    ['beef-strip-steak', 'NY Strip Steak', 'beef', 'lb'],
    ['beef-flank-steak', 'Flank Steak', 'beef', 'lb'],
    ['beef-short-ribs', 'Short Ribs', 'beef', 'lb'],
    ['beef-brisket', 'Brisket', 'beef', 'lb'],
    ['beef-stew-meat', 'Stew Meat', 'beef', 'lb'],

    // Pork
    ['pork-chops', 'Pork Chops', 'pork', 'lb'],
    ['pork-tenderloin', 'Pork Tenderloin', 'pork', 'lb'],
    ['pork-shoulder', 'Pork Shoulder', 'pork', 'lb'],
    ['pork-belly', 'Pork Belly', 'pork', 'lb'],
    ['pork-ground', 'Ground Pork', 'pork', 'lb'],
    ['ham-boneless', 'Ham, Boneless', 'pork', 'lb'],
    ['bacon', 'Bacon', 'pork', 'lb'],
    ['sausage', 'Pork Sausage', 'pork', 'lb'],
    ['sausage-italian', 'Italian Sausage', 'pork', 'lb'],

    // Poultry
    ['chicken-whole', 'Whole Chicken', 'poultry', 'lb'],
    ['chicken-breast-bone-in', 'Chicken Breast, Bone-In', 'poultry', 'lb'],
    ['chicken-breast-boneless-skinless', 'Chicken Breast, Boneless Skinless', 'poultry', 'lb'],
    ['chicken-thigh-boneless', 'Chicken Thigh, Boneless', 'poultry', 'lb'],
    ['chicken-thigh', 'Chicken Thigh', 'poultry', 'lb'],
    ['chicken-wings', 'Chicken Wings', 'poultry', 'lb'],
    ['chicken-drumsticks', 'Chicken Drumsticks', 'poultry', 'lb'],
    ['chicken-legs', 'Chicken Legs', 'poultry', 'lb'],
    ['chicken-ground', 'Ground Chicken', 'poultry', 'lb'],
    ['turkey-ground', 'Ground Turkey', 'poultry', 'lb'],
    ['turkey-breast', 'Turkey Breast', 'poultry', 'lb'],

    // Seafood
    ['salmon-atlantic-fillet', 'Atlantic Salmon Fillet', 'seafood', 'lb'],
    ['salmon-sockeye', 'Sockeye Salmon', 'seafood', 'lb'],
    ['cod-fillet', 'Cod Fillet', 'seafood', 'lb'],
    ['haddock-fillet', 'Haddock Fillet', 'seafood', 'lb'],
    ['halibut-fillet', 'Halibut Fillet', 'seafood', 'lb'],
    ['tuna-ahi', 'Ahi Tuna', 'seafood', 'lb'],
    ['tuna-steak', 'Tuna Steak', 'seafood', 'lb'],
    ['tuna-canned', 'Canned Tuna', 'seafood', 'lb'],
    ['swordfish-steak', 'Swordfish Steak', 'seafood', 'lb'],
    ['shrimp', 'Shrimp', 'seafood', 'lb'],
    ['shrimp-large', 'Large Shrimp', 'seafood', 'lb'],
    ['scallops-sea', 'Sea Scallops', 'seafood', 'lb'],
    ['lobster-whole', 'Whole Lobster', 'seafood', 'lb'],
    ['lobster-tail', 'Lobster Tail', 'seafood', 'lb'],
    ['clams-littleneck', 'Littleneck Clams', 'seafood', 'dozen'],
    ['mussels', 'Mussels', 'seafood', 'lb'],
    ['crab-meat', 'Crab Meat', 'seafood', 'lb'],
    ['oysters', 'Oysters', 'seafood', 'dozen'],

    // Dairy
    ['milk-whole', 'Whole Milk', 'dairy', 'gallon'],
    ['milk-2pct', '2% Milk', 'dairy', 'gallon'],
    ['milk-skim', 'Skim Milk', 'dairy', 'gallon'],
    ['cream-heavy', 'Heavy Cream', 'dairy', 'pint'],
    ['half-and-half', 'Half and Half', 'dairy', 'pint'],
    ['sour-cream', 'Sour Cream', 'dairy', 'pint'],
    ['cream-cheese', 'Cream Cheese', 'dairy', 'oz'],
    ['butter-unsalted', 'Unsalted Butter', 'dairy', 'lb'],
    ['butter-salted', 'Salted Butter', 'dairy', 'lb'],
    ['cheese-cheddar', 'Cheddar Cheese', 'dairy', 'lb'],
    ['cheese-mozzarella', 'Mozzarella Cheese', 'dairy', 'lb'],
    ['cheese-mozzarella-fresh', 'Fresh Mozzarella', 'dairy', 'lb'],
    ['cheese-parmesan', 'Parmesan Cheese', 'dairy', 'lb'],
    ['cheese-gruyere', 'Gruyere Cheese', 'dairy', 'lb'],
    ['cheese-ricotta', 'Ricotta Cheese', 'dairy', 'lb'],
    ['cheese-goat', 'Goat Cheese', 'dairy', 'lb'],
    ['cheese-american', 'American Cheese', 'dairy', 'lb'],
    ['yogurt-greek', 'Greek Yogurt', 'dairy', 'oz'],
    ['yogurt-plain', 'Plain Yogurt', 'dairy', 'oz'],
    ['eggs-large', 'Large Eggs', 'eggs', 'dozen'],

    // Produce - Vegetables
    ['onion-yellow', 'Yellow Onion', 'produce', 'lb'],
    ['onion-red', 'Red Onion', 'produce', 'lb'],
    ['onion-white', 'White Onion', 'produce', 'lb'],
    ['onion-sweet', 'Sweet Onion', 'produce', 'lb'],
    ['garlic', 'Garlic', 'produce', 'each'],
    ['shallot', 'Shallot', 'produce', 'lb'],
    ['potato-russet', 'Russet Potato', 'produce', 'lb'],
    ['potato-yukon-gold', 'Yukon Gold Potato', 'produce', 'lb'],
    ['sweet-potato', 'Sweet Potato', 'produce', 'lb'],
    ['potato-red', 'Red Potato', 'produce', 'lb'],
    ['tomato', 'Tomato', 'produce', 'lb'],
    ['tomato-cherry', 'Cherry Tomato', 'produce', 'pint'],
    ['tomato-roma', 'Roma Tomato', 'produce', 'lb'],
    ['tomato-heirloom', 'Heirloom Tomato', 'produce', 'lb'],
    ['carrot', 'Carrot', 'produce', 'lb'],
    ['celery', 'Celery', 'produce', 'lb'],
    ['bell-pepper-red', 'Red Bell Pepper', 'produce', 'each'],
    ['bell-pepper-green', 'Green Bell Pepper', 'produce', 'each'],
    ['broccoli', 'Broccoli', 'produce', 'lb'],
    ['cauliflower', 'Cauliflower', 'produce', 'lb'],
    ['spinach', 'Spinach', 'produce', 'lb'],
    ['spinach-baby', 'Baby Spinach', 'produce', 'oz'],
    ['kale', 'Kale', 'produce', 'bunch'],
    ['arugula', 'Arugula', 'produce', 'oz'],
    ['mixed-greens', 'Mixed Greens', 'produce', 'oz'],
    ['lettuce-romaine', 'Romaine Lettuce', 'produce', 'each'],
    ['lettuce-iceberg', 'Iceberg Lettuce', 'produce', 'each'],
    ['cucumber', 'Cucumber', 'produce', 'each'],
    ['zucchini', 'Zucchini', 'produce', 'lb'],
    ['squash-butternut', 'Butternut Squash', 'produce', 'lb'],
    ['asparagus', 'Asparagus', 'produce', 'lb'],
    ['green-beans', 'Green Beans', 'produce', 'lb'],
    ['mushroom-button', 'Button Mushroom', 'produce', 'lb'],
    ['mushroom-cremini', 'Cremini Mushroom', 'produce', 'lb'],
    ['mushroom-shiitake', 'Shiitake Mushroom', 'produce', 'lb'],
    ['mushroom-portobello', 'Portobello Mushroom', 'produce', 'lb'],
    ['corn-sweet', 'Sweet Corn', 'produce', 'each'],
    ['avocado', 'Avocado', 'produce', 'each'],
    ['artichoke', 'Artichoke', 'produce', 'each'],
    ['eggplant', 'Eggplant', 'produce', 'lb'],
    ['fennel', 'Fennel', 'produce', 'each'],
    ['leek', 'Leek', 'produce', 'each'],

    // Produce - Fruits
    ['lemon', 'Lemon', 'produce', 'each'],
    ['lime', 'Lime', 'produce', 'each'],
    ['orange', 'Orange', 'produce', 'lb'],
    ['apple', 'Apple', 'produce', 'lb'],
    ['apple-granny-smith', 'Granny Smith Apple', 'produce', 'lb'],
    ['banana', 'Banana', 'produce', 'lb'],
    ['strawberries', 'Strawberries', 'produce', 'lb'],
    ['blueberries', 'Blueberries', 'produce', 'pint'],
    ['raspberries', 'Raspberries', 'produce', 'pint'],
    ['grapes', 'Grapes', 'produce', 'lb'],

    // Fresh Herbs
    ['basil-fresh', 'Fresh Basil', 'herbs', 'bunch'],
    ['cilantro', 'Cilantro', 'herbs', 'bunch'],
    ['parsley-flat-leaf', 'Flat-Leaf Parsley', 'herbs', 'bunch'],
    ['rosemary-fresh', 'Fresh Rosemary', 'herbs', 'bunch'],
    ['thyme-fresh', 'Fresh Thyme', 'herbs', 'bunch'],
    ['dill-fresh', 'Fresh Dill', 'herbs', 'bunch'],
    ['mint-fresh', 'Fresh Mint', 'herbs', 'bunch'],
    ['chives', 'Chives', 'herbs', 'bunch'],
    ['tarragon-fresh', 'Fresh Tarragon', 'herbs', 'bunch'],
    ['sage-fresh', 'Fresh Sage', 'herbs', 'bunch'],
    ['oregano-fresh', 'Fresh Oregano', 'herbs', 'bunch'],

    // Pantry
    ['olive-oil-evoo', 'Extra Virgin Olive Oil', 'oils', 'fl_oz'],
    ['oil-vegetable', 'Vegetable Oil', 'oils', 'fl_oz'],
    ['oil-canola', 'Canola Oil', 'oils', 'fl_oz'],
    ['oil-coconut', 'Coconut Oil', 'oils', 'fl_oz'],
    ['sugar-granulated', 'Granulated Sugar', 'pantry', 'lb'],
    ['sugar-brown', 'Brown Sugar', 'pantry', 'lb'],
    ['honey', 'Honey', 'pantry', 'oz'],
    ['maple-syrup', 'Maple Syrup', 'pantry', 'fl_oz'],
    ['vanilla-extract', 'Vanilla Extract', 'pantry', 'fl_oz'],
    ['vinegar-balsamic', 'Balsamic Vinegar', 'pantry', 'fl_oz'],
    ['vinegar-red-wine', 'Red Wine Vinegar', 'pantry', 'fl_oz'],
    ['vinegar-apple-cider', 'Apple Cider Vinegar', 'pantry', 'fl_oz'],
    ['soy-sauce', 'Soy Sauce', 'pantry', 'fl_oz'],
    ['worcestershire-sauce', 'Worcestershire Sauce', 'pantry', 'fl_oz'],
    ['mustard-dijon', 'Dijon Mustard', 'pantry', 'oz'],
    ['stock-chicken', 'Chicken Stock', 'pantry', 'fl_oz'],
    ['stock-beef', 'Beef Stock', 'pantry', 'fl_oz'],
    ['tomato-paste', 'Tomato Paste', 'pantry', 'oz'],
    ['tomato-sauce', 'Tomato Sauce', 'pantry', 'oz'],
    ['tomatoes-crushed-canned', 'Crushed Tomatoes (Canned)', 'pantry', 'oz'],
    ['tomatoes-diced-canned', 'Diced Tomatoes (Canned)', 'pantry', 'oz'],
    ['tomatoes-san-marzano', 'San Marzano Tomatoes', 'pantry', 'oz'],
    ['coconut-milk', 'Coconut Milk', 'pantry', 'fl_oz'],
    ['peanut-butter', 'Peanut Butter', 'pantry', 'lb'],
    ['coffee-ground', 'Ground Coffee', 'pantry', 'lb'],

    // Spices
    ['salt-kosher', 'Kosher Salt', 'spices', 'oz'],
    ['salt-sea', 'Sea Salt', 'spices', 'oz'],
    ['pepper-black-ground', 'Black Pepper, Ground', 'spices', 'oz'],
    ['peppercorns-black', 'Black Peppercorns', 'spices', 'oz'],
    ['cumin-ground', 'Ground Cumin', 'spices', 'oz'],
    ['paprika', 'Paprika', 'spices', 'oz'],
    ['paprika-smoked', 'Smoked Paprika', 'spices', 'oz'],
    ['cinnamon-ground', 'Ground Cinnamon', 'spices', 'oz'],
    ['nutmeg', 'Nutmeg', 'spices', 'oz'],
    ['oregano-dried', 'Dried Oregano', 'spices', 'oz'],
    ['red-pepper-flakes', 'Red Pepper Flakes', 'spices', 'oz'],
    ['cayenne-pepper', 'Cayenne Pepper', 'spices', 'oz'],
    ['turmeric', 'Turmeric', 'spices', 'oz'],
    ['ginger-ground', 'Ground Ginger', 'spices', 'oz'],
    ['ginger-fresh', 'Fresh Ginger', 'produce', 'lb'],
    ['bay-leaves', 'Bay Leaves', 'spices', 'oz'],
    ['coriander-ground', 'Ground Coriander', 'spices', 'oz'],
  ];

  for (const [id, name, category, unit] of ingredients) {
    insert.run(id, name, category, unit);
  }

  console.log(`[DB] Ensured ${ingredients.length} canonical ingredients exist`);
}

/**
 * Main execution
 */
async function main() {
  console.log('=== OpenClaw Government Data Scraper ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  const db = getDb();

  // Ensure sources and ingredients exist
  ensureSourcesExist(db);
  ensureCanonicalIngredients(db);

  // Fetch BLS data
  const blsResults = await fetchBLS();
  if (blsResults.length > 0) {
    storeBLSResults(db, blsResults);
  }

  // Fetch FRED data (CPI indexes for trend tracking)
  const fredResults = await fetchFRED();
  console.log(`[FRED] CPI data points stored for trend tracking: ${fredResults.length}`);

  // Print summary
  const stats = (await import('../lib/db.mjs')).getStats(db);
  console.log('');
  console.log('=== Database Summary ===');
  console.log(`Sources: ${stats.sources}`);
  console.log(`Canonical Ingredients: ${stats.canonicalIngredients}`);
  console.log(`Current Prices: ${stats.currentPrices}`);
  console.log(`Price Changes Logged: ${stats.priceChanges}`);
  console.log('');

  // Show some sample prices
  const samples = db.prepare(`
    SELECT ci.name, cp.price_cents, cp.price_unit, cp.confidence
    FROM current_prices cp
    JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
    ORDER BY ci.name
    LIMIT 20
  `).all();

  if (samples.length > 0) {
    console.log('=== Sample Prices (first 20) ===');
    for (const s of samples) {
      const dollars = (s.price_cents / 100).toFixed(2);
      console.log(`  ${s.name}: $${dollars}/${s.price_unit} [${s.confidence}]`);
    }
  }

  console.log('');
  console.log('=== Done ===');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
