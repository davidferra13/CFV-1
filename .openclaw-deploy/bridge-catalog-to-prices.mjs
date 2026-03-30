/**
 * Bridge: catalog_products + catalog_store_products -> current_prices
 *
 * The new department/catalog walkers write to the catalog_* tables.
 * The sync API reads from current_prices. This script bridges them.
 *
 * All IDs in legacy tables are text slugs (e.g. "flour-all-purpose"),
 * not integers or UUIDs. This script generates matching slug IDs.
 *
 * Run after any catalog walker finishes, and before the ChefFlow sync.
 * Safe to run repeatedly (idempotent via upsert on id).
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '..', 'data', 'prices.db'));

console.log('=== Bridging catalog_products -> current_prices ===');
console.log('Time:', new Date().toISOString());

// --- Slug generation ---
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const now = new Date().toISOString();

// --- Unit price normalization ---
// Converts price_cents + size_value + size_unit into price_per_standard_unit_cents
// Standard units: 'oz' for weight/volume, 'lb' for bulk meats, 'each' for count items
const unitToOz = {
  'oz': 1,
  'fl oz': 1,       // treat fl oz as oz for price comparison
  'lb': 16,
  'g': 0.035274,
  'kg': 35.274,
  'ml': 0.033814,
  'l': 33.814,
  'gal': 128,
  'qt': 32,
  'pt': 16,
};

// Fallback parser: extract size from raw size string (e.g., "1.75 qt", "per lb", "12 oz")
function parseSizeString(sizeStr) {
  if (!sizeStr) return null;
  const s = sizeStr.toLowerCase().trim();

  // "per lb" pattern (deli/meat counter) - price IS per lb already
  if (s === 'per lb') return { value: 1, unit: 'lb' };

  // "each" pattern - single item
  if (s === 'each') return { value: 1, unit: 'each' };

  // "N unit" pattern
  const m = s.match(/^([\d.]+)\s*(oz|fl\s*oz|lb|g|kg|ml|l|gal|qt|pt|ct|each|pack)$/);
  if (m) return { value: parseFloat(m[1]), unit: m[2].replace(/\s+/g, ' ') };

  return null;
}

function computeUnitPrice(priceCents, sizeValue, sizeUnit, rawSizeStr) {
  let val = sizeValue;
  let unit = sizeUnit;

  // If no parsed value, try to extract from raw size string
  if ((!val || val <= 0 || !unit) && rawSizeStr) {
    const parsed = parseSizeString(rawSizeStr);
    if (parsed) {
      val = parsed.value;
      unit = parsed.unit;
    }
  }

  if (!val || val <= 0 || !unit) return null;

  unit = unit.toLowerCase().trim();

  // Count items (ct, each, pack) - price per each
  if (unit === 'each' || unit === 'ct' || unit === 'pack') {
    if (val === 1) return { cents: priceCents, unit: 'each' };
    return { cents: Math.round(priceCents / val), unit: 'each' };
  }

  // Weight/volume items - normalize to price per oz
  const factor = unitToOz[unit];
  if (!factor) return null;

  const totalOz = val * factor;
  if (totalOz <= 0) return null;

  return { cents: Math.round(priceCents / totalOz), unit: 'oz' };
}

// Step 1: Ensure source_registry has entries for each chain
const chains = db.prepare(
  'SELECT DISTINCT chain_slug FROM catalog_stores WHERE is_active = 1'
).all();

const nameMap = {
  market_basket: 'Market Basket (via Instacart)',
  hannaford: 'Hannaford (via Instacart)',
  aldi: 'Aldi (via Instacart)',
  stop_and_shop: 'Stop & Shop (via Instacart)',
  shaws: "Shaw's (via Instacart)",
  costco: 'Costco (via Instacart)',
  bjs: "BJ's (via Instacart)",
  whole_foods: 'Whole Foods (via Instacart)',
  walmart: 'Walmart (via Instacart)',
  target: 'Target (via Instacart)',
  trader_joes: "Trader Joe's (via Instacart)",
};

const chainToSourceId = {};
for (const chain of chains) {
  const slug = chain.chain_slug;
  const name = nameMap[slug] || slug + ' (via Instacart)';
  const sourceId = 'ic-' + slug.replace(/_/g, '-');

  let source = db.prepare(
    'SELECT source_id FROM source_registry WHERE source_id = ?'
  ).get(sourceId);

  if (!source) {
    db.prepare(
      "INSERT INTO source_registry (source_id, name, type, chain_id, city, state, scrape_method, status, pricing_tier, created_at, updated_at) VALUES (?, ?, 'instacart_catalog', ?, 'Haverhill', 'MA', 'instacart_get_api', 'active', 'retail', ?, ?)"
    ).run(sourceId, name, slug, now, now);
    console.log('Created source:', sourceId, '-', name);
  }

  chainToSourceId[slug] = sourceId;
}

// Step 2: Pick best store per chain (most products)
const bestStores = db.prepare(`
  SELECT cs.chain_slug, csp.store_id, COUNT(*) as cnt
  FROM catalog_store_products csp
  JOIN catalog_stores cs ON cs.id = csp.store_id
  WHERE csp.price_cents > 0 AND csp.price_cents < 500000
  GROUP BY cs.chain_slug, csp.store_id
  ORDER BY cs.chain_slug, cnt DESC
`).all();

const bestStorePerChain = {};
for (const row of bestStores) {
  if (!bestStorePerChain[row.chain_slug]) {
    bestStorePerChain[row.chain_slug] = row.store_id;
  }
}

console.log('Best store per chain:');
for (const [slug, storeId] of Object.entries(bestStorePerChain)) {
  console.log('  ' + slug + ': store_id=' + storeId);
}

const storeIds = Object.values(bestStorePerChain);
const placeholders = storeIds.map(() => '?').join(',');

const storeProducts = db.prepare(`
  SELECT
    cp.id as product_id,
    cp.name,
    cp.brand,
    cp.size,
    cp.size_value,
    cp.size_unit,
    cp.category,
    cp.department,
    cp.image_url,
    cp.is_organic,
    csp.price_cents,
    csp.sale_price_cents,
    csp.in_stock,
    csp.last_seen_at,
    cs.chain_slug
  FROM catalog_store_products csp
  JOIN catalog_products cp ON cp.id = csp.product_id
  JOIN catalog_stores cs ON cs.id = csp.store_id
  WHERE csp.store_id IN (${placeholders})
    AND csp.price_cents > 0
    AND csp.price_cents < 500000
  ORDER BY cs.chain_slug, cp.name
`).all(...storeIds);

console.log('Store products to bridge:', storeProducts.length);

// --- Smart canonical matching ---
// Instead of always creating new canonicals from product names,
// try to match catalog products to EXISTING canonical ingredients.
// This ensures "Badia Spices Saffron, Pure Selected" maps to the existing "saffron" canonical.

const allCanonicals = db.prepare(
  'SELECT ingredient_id, name FROM canonical_ingredients'
).all();

// Build keyword index: word -> [canonical_ids]
const canonicalKeywordIndex = new Map();
const canonicalByExactName = new Map();
for (const ci of allCanonicals) {
  const lower = ci.name.toLowerCase();
  canonicalByExactName.set(lower, ci.ingredient_id);
  const words = lower.split(/[\s,()]+/).filter(w => w.length >= 3);
  for (const word of words) {
    if (!canonicalKeywordIndex.has(word)) canonicalKeywordIndex.set(word, []);
    canonicalKeywordIndex.get(word).push({ id: ci.ingredient_id, name: lower, wordCount: words.length });
  }
}

// Strip brand from product name for matching
function stripBrand(productName, brand) {
  if (!brand) return productName;
  const lower = productName.toLowerCase();
  const brandLower = brand.toLowerCase();
  // Remove brand from start of name
  if (lower.startsWith(brandLower + ' ')) {
    return productName.substring(brand.length + 1).trim();
  }
  return productName;
}

// Find best existing canonical for a catalog product
function findExistingCanonical(productName, brand) {
  const cleanName = stripBrand(productName, brand).toLowerCase();

  // Try exact match on clean name first
  const exact = canonicalByExactName.get(cleanName);
  if (exact) return exact;

  // Try keywords: find canonicals that share the most important words
  const queryWords = cleanName.split(/[\s,()]+/).filter(w => w.length >= 3);
  if (queryWords.length === 0) return null;

  // Score each candidate by word overlap
  const scores = new Map();
  for (const word of queryWords) {
    const candidates = canonicalKeywordIndex.get(word) || [];
    for (const c of candidates) {
      const prev = scores.get(c.id) || { id: c.id, name: c.name, hits: 0, wordCount: c.wordCount };
      prev.hits++;
      scores.set(c.id, prev);
    }
  }

  // Find best: must match ALL words of the canonical name (canonical is subset of product)
  let best = null;
  let bestScore = 0;
  for (const [id, info] of scores) {
    // The canonical name's words must ALL appear in the product name
    const canonWords = info.name.split(/[\s,()]+/).filter(w => w.length >= 3);
    const allMatch = canonWords.every(cw => cleanName.includes(cw));
    if (!allMatch) continue;

    // Prefer shorter canonicals (more generic = better match)
    // Score = fraction of canonical words matched / canonical word count (prefer specific)
    const score = canonWords.length;
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }

  return best;
}

console.log('Pre-existing canonical ingredients:', allCanonicals.length);

// Prepare statements for slug-based tables
const findCanonical = db.prepare(
  'SELECT ingredient_id FROM canonical_ingredients WHERE ingredient_id = ?'
);
const insertCanonical = db.prepare(
  'INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit, created_at) VALUES (?, ?, ?, ?, ?)'
);
const findVariant = db.prepare(
  'SELECT variant_id FROM ingredient_variants WHERE variant_id = ?'
);
const insertVariant = db.prepare(
  'INSERT OR IGNORE INTO ingredient_variants (variant_id, ingredient_id, name, is_default) VALUES (?, ?, ?, 0)'
);
const upsertPrice = db.prepare(`
  INSERT OR REPLACE INTO current_prices (
    id, source_id, canonical_ingredient_id, variant_id, raw_product_name,
    price_cents, price_unit, package_size, price_type, pricing_tier, confidence,
    instacart_markup_applied_pct, last_confirmed_at, last_changed_at, created_at,
    in_stock, image_url, price_per_standard_unit_cents, standard_unit
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'regular', 'retail', 'instacart_catalog', 0, ?, ?, ?, ?, ?, ?, ?)
`);

let bridged = 0, matched = 0, newCanonical = 0, newVariant = 0, normalized = 0, errors = 0;

const runBridge = db.transaction(() => {
  for (const sp of storeProducts) {
    try {
      const sourceId = chainToSourceId[sp.chain_slug];
      if (!sourceId) continue;

      const productName = sp.name.replace(/\s+/g, ' ').trim();
      if (!productName) continue;

      // Try to match to existing canonical, fall back to slugified name
      const existingCanonical = findExistingCanonical(productName, sp.brand);
      const canonicalId = existingCanonical || slugify(productName);
      if (!canonicalId) continue;
      if (existingCanonical) matched++;

      const variantSlug = sp.brand
        ? slugify(sp.brand) + ':' + canonicalId
        : canonicalId + ':default';

      const priceId = sourceId + ':' + canonicalId + ':' + variantSlug;

      // Ensure canonical exists
      if (!findCanonical.get(canonicalId)) {
        insertCanonical.run(
          canonicalId,
          productName,
          sp.department || sp.category || 'Other',
          sp.size_unit || 'each',
          now
        );
        newCanonical++;
      }

      // Ensure variant exists
      if (!findVariant.get(variantSlug)) {
        insertVariant.run(
          variantSlug,
          canonicalId,
          sp.brand ? sp.brand + ' ' + productName : productName
        );
        newVariant++;
      }

      // Compute unit price normalization (with fallback size parsing)
      const unitPrice = computeUnitPrice(sp.price_cents, sp.size_value, sp.size_unit, sp.size);

      // Upsert price
      upsertPrice.run(
        priceId,
        sourceId,
        canonicalId,
        variantSlug,
        productName,
        sp.price_cents,
        sp.size_unit || 'each',
        sp.size || null,
        sp.last_seen_at || now,
        sp.last_seen_at || now,
        now,
        sp.in_stock ? 1 : 0,
        sp.image_url || null,
        unitPrice ? unitPrice.cents : null,
        unitPrice ? unitPrice.unit : null
      );
      if (unitPrice) normalized++;

      bridged++;
    } catch (err) {
      errors++;
      if (errors <= 10) console.error('Error:', sp.name, '-', err.message);
    }
  }
});

runBridge();

console.log('\n=== Bridge Complete ===');
console.log('Bridged:', bridged);
console.log('New canonical ingredients:', newCanonical);
console.log('Matched to existing canonical:', matched);
console.log('New variants:', newVariant);
console.log('Unit prices computed:', normalized);
console.log('Errors:', errors);

// Verify
const totalPrices = db.prepare('SELECT COUNT(*) as c FROM current_prices').get();
const totalCanonical = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();
console.log('\nTotal current_prices:', totalPrices.c);
console.log('Total canonical_ingredients:', totalCanonical.c);

db.close();
