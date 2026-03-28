/**
 * Fix OpenClaw enriched endpoint: pass through actual source type + add unit sanity checks.
 *
 * Problem 1: The enriched endpoint returns `tier: pricing_tier` ("retail"/"wholesale")
 * but ChefFlow needs the actual source type from the `confidence` column
 * (instacart_catalog, flyer_scrape, government_baseline) to power its 8-tier system.
 *
 * Problem 2: Bulk/package prices (garlic at $139.99/each from Restaurant Depot)
 * are clearly case prices, not per-unit. These outliers poison the "best price" calculation.
 *
 * Run on Pi: node fix-tier-passthrough.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiPath = join(__dirname, 'services', 'sync-api.mjs');

let code = readFileSync(apiPath, 'utf8');

// ============================
// FIX 1: Pass through source type in enriched prices
// ============================

// The current code builds enriched prices like this:
//   tier: p.pricing_tier || 'retail',
// But pricing_tier is just "retail"/"wholesale". The actual source type
// is in the `confidence` column (instacart_catalog, flyer_scrape, etc.)
// We need to pass BOTH through.

const oldTierLine = "tier: p.pricing_tier || 'retail',";
const newTierLine = "tier: p.confidence || p.pricing_tier || 'retail',\n              pricing_tier: p.pricing_tier || 'retail',";

if (code.includes(oldTierLine)) {
  code = code.replace(oldTierLine, newTierLine);
  console.log('Fix 1: Patched tier to use confidence (source type) field');
} else {
  console.log('Fix 1: Already patched or pattern not found');
}

// ============================
// FIX 2: Add outlier filtering to enriched endpoint
// ============================
// Filter out prices that are clearly bulk/case prices:
// - "each" priced items over $50 are likely case prices
// - Per-unit prices should not exceed reasonable retail maximums

// Find where enrichedPrices is built and add a filter after
const enrichedPricesPattern = "const enrichedPrices = allPrices.map(p => ({";
const filterCode = `// Filter out obvious bulk/case prices that would poison best-price calc
            const filteredPrices = allPrices.filter(p => {
              // Skip "each" items over $50 (likely case/bulk pricing)
              if ((p.price_unit === 'each' || !p.price_unit) && p.price_cents > 5000) return false;
              // Skip per-lb items over $100/lb (likely mislabeled)
              if (p.price_unit === 'lb' && p.price_cents > 10000) return false;
              return true;
            });

            // Use filtered for best price, but keep all for reference
            const enrichedPrices = allPrices.map(p => ({`;

if (code.includes(enrichedPricesPattern)) {
  code = code.replace(enrichedPricesPattern, filterCode);
  console.log('Fix 2: Added outlier filter before enriched price mapping');
} else {
  console.log('Fix 2: enrichedPrices pattern not found');
}

// Also need to change best price to use filtered list
const oldBestPrice = `const bestPrice = enrichedPrices.length > 0
              ? enrichedPrices.reduce((a, b) => a.normalized_cents < b.normalized_cents ? a : b)
              : null;`;

const newBestPrice = `// Build filtered enriched prices for best-price calculation
            const filteredEnriched = filteredPrices.map(p => ({
              cents: p.price_cents,
              normalized_cents: normalizeCents(p.price_cents, p.price_unit),
              normalized_unit: normalizeUnit(p.price_unit),
              original_unit: p.price_unit || 'each',
              store: p.source_name,
              tier: p.confidence || p.pricing_tier || 'retail',
              pricing_tier: p.pricing_tier || 'retail',
              confirmed_at: p.last_confirmed_at || new Date().toISOString(),
              in_stock: p.in_stock === 1,
            }));

            const bestPrice = filteredEnriched.length > 0
              ? filteredEnriched.reduce((a, b) => a.normalized_cents < b.normalized_cents ? a : b)
              : (enrichedPrices.length > 0
                ? enrichedPrices.reduce((a, b) => a.normalized_cents < b.normalized_cents ? a : b)
                : null);`;

if (code.includes(oldBestPrice)) {
  code = code.replace(oldBestPrice, newBestPrice);
  console.log('Fix 2b: Updated best price to use filtered list with fallback');
} else {
  console.log('Fix 2b: bestPrice pattern not found (may need manual check)');
}

writeFileSync(apiPath, code);
console.log('\nDone! Restart openclaw-sync-api to apply.');
