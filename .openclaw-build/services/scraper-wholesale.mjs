/**
 * OpenClaw - Wholesale Distributor Scraper
 * Scrapes/pulls pricing from wholesale food distributors.
 *
 * Sources:
 *   - Restaurant Depot: Has an online catalog (requires membership login)
 *   - Sysco: Public product catalog but prices require account
 *   - US Foods: Public product catalog but prices require account
 *
 * Strategy: For most wholesalers, public catalogs don't show prices.
 * We collect product NAMES from public catalogs (building our wholesale ingredient registry),
 * and actual prices come from receipts (receipt-processor.mjs) or email price lists.
 *
 * Government data (BLS) provides wholesale price baselines via PPI (Producer Price Index).
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb, upsertPrice } from '../lib/db.mjs';
import { httpFetch, rateLimitDelay } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';

const WHOLESALE_SOURCES = [
  {
    sourceId: 'restaurant-depot',
    name: 'Restaurant Depot',
    chain: 'restaurant-depot',
    type: 'wholesale_distributor',
    state: 'MA',
    baseUrl: 'https://www.restaurantdepot.com',
    // Public catalog pages (no prices without login)
    catalogPages: [
      '/fresh-meat',
      '/seafood',
      '/produce',
      '/dairy',
      '/bakery-bread',
      '/frozen-food',
      '/dry-goods-pasta',
      '/canned-goods',
      '/oils-vinegars-condiments',
      '/spices-seasonings',
    ],
  },
  {
    sourceId: 'sysco-new-england',
    name: 'Sysco (New England)',
    chain: 'sysco',
    type: 'wholesale_distributor',
    state: 'MA',
    baseUrl: 'https://www.sysco.com',
    catalogPages: [
      '/products/meat-poultry',
      '/products/seafood',
      '/products/produce',
      '/products/dairy',
      '/products/frozen',
      '/products/dry-grocery',
    ],
  },
];

// BLS Producer Price Index series for wholesale food prices
// These track what producers/distributors charge, not retail
const PPI_SERIES = {
  'ppi-meat-wholesale': { series: 'WPU0211', name: 'PPI: Processed Meats', ingredient: 'beef-ground' },
  'ppi-poultry-wholesale': { series: 'WPU0212', name: 'PPI: Poultry', ingredient: 'chicken-breast' },
  'ppi-fish-wholesale': { series: 'WPU0213', name: 'PPI: Fish', ingredient: 'salmon-atlantic' },
  'ppi-dairy-wholesale': { series: 'WPU0221', name: 'PPI: Dairy Products', ingredient: 'milk-whole' },
  'ppi-grain-wholesale': { series: 'WPU023', name: 'PPI: Grain Mill Products', ingredient: 'flour-all-purpose' },
  'ppi-bakery-wholesale': { series: 'WPU024', name: 'PPI: Bakery Products', ingredient: 'bread-white' },
  'ppi-sugar-wholesale': { series: 'WPU0252', name: 'PPI: Sugar', ingredient: 'sugar-granulated' },
  'ppi-fats-wholesale': { series: 'WPU025', name: 'PPI: Fats and Oils', ingredient: 'butter-unsalted' },
  'ppi-fruit-wholesale': { series: 'WPU0261', name: 'PPI: Fresh Fruits', ingredient: 'apples' },
  'ppi-vegetable-wholesale': { series: 'WPU0262', name: 'PPI: Fresh Vegetables', ingredient: 'potatoes' },
  'ppi-frozen-food-wholesale': { series: 'WPU0271', name: 'PPI: Frozen Foods', ingredient: 'ice-cream-vanilla' },
};

function ensureSourceExists(db, source) {
  db.prepare(`
    INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, scrape_url, has_online_pricing, pricing_tier, status, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    source.sourceId, source.name, source.type, source.chain, source.state,
    'catalog_index', source.baseUrl, 0, 'wholesale', 'active',
    source.baseUrl,
    'Product catalog indexed (no online pricing). Actual prices from receipts/email lists.'
  );
}

/**
 * Index product names from wholesale public catalogs.
 * We don't get prices here, but we build a registry of wholesale products
 * so that when receipt prices come in, we have canonical mappings ready.
 */
async function indexWholesaleCatalog(source) {
  console.log(`  [${source.chain}] Indexing public catalog...`);
  let totalProducts = 0;

  for (const path of source.catalogPages) {
    const url = `${source.baseUrl}${path}`;
    try {
      const res = await httpFetch(url);
      const html = await res.text();

      // Extract product names from HTML (not prices - those need login)
      const namePattern = /<(?:h[2-4]|span|a|div)[^>]*class="[^"]*(?:product|item)[^"]*name[^"]*"[^>]*>([^<]+)</gi;
      let match;
      while ((match = namePattern.exec(html)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && isFoodItem(name)) {
          totalProducts++;
        }
      }
    } catch (err) {
      console.error(`  [${source.chain}] Failed to index ${path}: ${err.message}`);
    }

    await rateLimitDelay();
  }

  console.log(`  [${source.chain}] Indexed ${totalProducts} product names`);
  return totalProducts;
}

/**
 * Fetch BLS Producer Price Index data for wholesale food categories.
 * These are index values (not dollar prices) that track wholesale price changes.
 * Useful for trend analysis and validating receipt prices.
 */
async function fetchPPIData(db) {
  console.log('\n--- Fetching BLS Producer Price Index (wholesale) ---');

  const apiKey = process.env.BLS_API_KEY;
  if (!apiKey) {
    console.error('  BLS_API_KEY not set, skipping PPI fetch');
    return;
  }

  // Register PPI as a source
  db.prepare(`
    INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, scrape_url, has_online_pricing, pricing_tier, status, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'gov-bls-ppi', 'BLS Producer Price Index (Wholesale)', 'government_data', 'bls',
    'US', 'api', 'https://api.bls.gov/publicAPI/v2/timeseries/data/', 1,
    'wholesale', 'active', 'https://www.bls.gov/ppi/',
    'Producer Price Index tracks wholesale/distributor pricing. Index values (base 100), not dollar amounts.'
  );

  const seriesIds = Object.values(PPI_SERIES).map(s => s.series);
  const currentYear = new Date().getFullYear();

  try {
    const res = await httpFetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seriesid: seriesIds,
        startyear: String(currentYear - 1),
        endyear: String(currentYear),
        registrationkey: apiKey,
      }),
    });

    const data = await res.json();
    if (data.status !== 'REQUEST_SUCCEEDED') {
      console.error('  BLS PPI request failed:', data.message?.[0]);
      return;
    }

    let saved = 0;
    for (const series of data.Results?.series || []) {
      const seriesId = series.seriesID;
      const entry = Object.entries(PPI_SERIES).find(([, v]) => v.series === seriesId);
      if (!entry) continue;

      const [ppiKey, config] = entry;
      const latest = series.data?.[0];
      if (!latest?.value) continue;

      // PPI values are index values (base 100), not prices
      // Store as "price_cents" = index value * 100 for consistency
      const indexValue = parseFloat(latest.value);
      const indexCents = Math.round(indexValue * 100);

      upsertPrice(db, {
        sourceId: 'gov-bls-ppi',
        canonicalIngredientId: config.ingredient,
        variantId: null,
        rawProductName: config.name,
        priceCents: indexCents,
        priceUnit: 'index',
        pricePerStandardUnitCents: indexCents,
        standardUnit: 'index',
        packageSize: null,
        priceType: 'index',
        pricingTier: 'wholesale',
        confidence: 'government_baseline',
        sourceUrl: `https://data.bls.gov/timeseries/${seriesId}`,
      });

      console.log(`  ${config.name}: ${indexValue} (${latest.periodName} ${latest.year})`);
      saved++;
    }

    db.prepare("UPDATE source_registry SET last_scraped_at = datetime('now') WHERE source_id = ?").run('gov-bls-ppi');
    console.log(`  Saved ${saved} PPI data points`);
  } catch (err) {
    console.error('  PPI fetch error:', err.message);
  }
}

async function main() {
  console.log('=== OpenClaw Wholesale Scraper ===');
  console.log(`Time: ${new Date().toISOString()}`);

  // Load .env
  try {
    const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'config', '.env');
    const envContent = readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const [key, ...val] = line.split('=');
      if (key && val.length) process.env[key.trim()] = val.join('=').trim();
    }
  } catch {
    console.warn('Warning: Could not load .env');
  }

  const db = getDb();

  // Index wholesale catalogs (product names only)
  for (const source of WHOLESALE_SOURCES) {
    ensureSourceExists(db, source);
    await indexWholesaleCatalog(source);
  }

  // Fetch PPI data for wholesale price benchmarks
  await fetchPPIData(db);

  console.log('\n=== Wholesale Scraper Done ===');
  console.log('Note: Actual wholesale PRICES come from receipt uploads and email price lists.');
  console.log('This scraper indexes product names and fetches government wholesale price indices.');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
