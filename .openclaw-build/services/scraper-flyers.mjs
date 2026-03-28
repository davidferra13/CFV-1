/**
 * OpenClaw - Weekly Flyer Scraper
 * Scrapes weekly sale flyers from stores that publish them online.
 * Key targets: Market Basket, Hannaford, Stop & Shop, Shaw's, Aldi, Price Chopper.
 *
 * Strategy: Most stores publish flyers via Flipp or their own circular pages.
 * We extract sale prices and mark them with price_type='sale' and date ranges.
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { httpFetch, rateLimitDelay, sleep } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';

const FLYER_SOURCES = [
  {
    sourceId: 'market-basket-flyer',
    name: 'Market Basket Weekly Flyer',
    chain: 'market-basket',
    state: 'MA',
    flyerUrl: 'https://www.shopmarketbasket.com/weekly-flyer',
    method: 'html_parse', // Parse the HTML circular page
  },
  {
    sourceId: 'hannaford-flyer',
    name: 'Hannaford Weekly Flyer',
    chain: 'hannaford',
    state: 'MA',
    flyerUrl: 'https://www.hannaford.com/circular',
    method: 'html_parse',
  },
  {
    sourceId: 'aldi-flyer',
    name: 'Aldi Weekly Specials',
    chain: 'aldi',
    state: 'MA',
    flyerUrl: 'https://www.aldi.us/weekly-specials/this-weeks-aldi-finds/',
    method: 'html_parse',
  },
  {
    sourceId: 'price-chopper-flyer',
    name: 'Price Chopper Weekly Flyer',
    chain: 'price-chopper',
    state: 'MA',
    flyerUrl: 'https://www.pricechopper.com/weekly-flyer/',
    method: 'html_parse',
  },
];

function ensureSourceExists(db, source) {
  db.prepare(`
    INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, scrape_url, has_online_pricing, pricing_tier, status, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    source.sourceId, source.name, 'weekly_flyer', source.chain, source.state,
    'flyer_scrape', source.flyerUrl, 1, 'retail', 'active',
    source.flyerUrl, 'Weekly sale prices from store circulars. Updated weekly.'
  );
}

/**
 * Extract sale items from HTML flyer pages.
 * Most grocery flyers embed JSON-LD structured data or have
 * recognizable product-price patterns in the HTML.
 */
async function scrapeFlyerHTML(source) {
  console.log(`  [${source.chain}] Fetching ${source.flyerUrl}`);

  try {
    const res = await httpFetch(source.flyerUrl);
    const html = await res.text();
    const items = [];

    // Strategy 1: Look for JSON-LD structured data (some stores use this)
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        if (data['@type'] === 'Product' || (Array.isArray(data) && data[0]?.['@type'] === 'Product')) {
          const products = Array.isArray(data) ? data : [data];
          for (const p of products) {
            if (p.name && p.offers?.price) {
              items.push({
                name: p.name,
                priceText: `$${p.offers.price}`,
                size: p.weight || p.size || '',
                saleStart: p.offers.validFrom || null,
                saleEnd: p.offers.validThrough || null,
              });
            }
          }
        }
      } catch (e) {
        // Invalid JSON-LD, skip
      }
    }

    // Strategy 2: Parse common flyer HTML patterns
    // Look for price patterns in the HTML: "$X.XX" near product names
    const pricePattern = /(?:<[^>]*class="[^"]*(?:product|item|deal|offer|special)[^"]*"[^>]*>[\s\S]*?)?(?:<[^>]*class="[^"]*(?:name|title|description)[^"]*"[^>]*>([^<]+)<[\s\S]*?)?(?:\$(\d+\.\d{2}))/gi;
    let priceMatch;
    while ((priceMatch = pricePattern.exec(html)) !== null) {
      if (priceMatch[1] && priceMatch[2]) {
        items.push({
          name: priceMatch[1].trim(),
          priceText: `$${priceMatch[2]}`,
          size: '',
          saleStart: null,
          saleEnd: null,
        });
      }
    }

    // Strategy 3: Look for Flipp embed data (many stores use Flipp for digital circulars)
    const flippMatch = html.match(/flipp\.com\/flyers\/(\d+)/);
    if (flippMatch && items.length === 0) {
      console.log(`  [${source.chain}] Found Flipp embed, attempting Flipp API`);
      const flippItems = await scrapeFlippCircular(flippMatch[1]);
      items.push(...flippItems);
    }

    console.log(`  [${source.chain}] Found ${items.length} flyer items`);
    return items;
  } catch (err) {
    console.error(`  [${source.chain}] Failed to fetch flyer: ${err.message}`);
    return [];
  }
}

/**
 * Attempt to get flyer data from Flipp's public API.
 * Many grocery chains use Flipp for their digital circulars.
 */
async function scrapeFlippCircular(flyerId) {
  try {
    const res = await httpFetch(
      `https://dam.flipp.com/flyer-items?locale=en&postal_code=01835&flyer_id=${flyerId}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await res.json();

    if (!Array.isArray(data)) return [];

    return data
      .filter(item => item.name && item.current_price)
      .map(item => ({
        name: item.name,
        priceText: `$${item.current_price}`,
        size: item.description || '',
        saleStart: item.valid_from || null,
        saleEnd: item.valid_to || null,
      }));
  } catch (err) {
    console.error(`  [Flipp] API failed for flyer ${flyerId}: ${err.message}`);
    return [];
  }
}

function parsePriceCents(priceText) {
  if (!priceText) return null;
  const multiMatch = priceText.match(/(\d+)\s*(?:\/|for)\s*\$?([\d.]+)/);
  if (multiMatch) {
    const qty = parseInt(multiMatch[1]);
    const total = parseFloat(multiMatch[2]);
    if (qty > 0 && total > 0) return Math.round((total / qty) * 100);
  }
  const priceMatch = priceText.match(/\$?([\d]+\.[\d]{2})/);
  if (priceMatch) return Math.round(parseFloat(priceMatch[1]) * 100);
  return null;
}

function detectUnit(name, size) {
  const combined = `${name} ${size}`.toLowerCase();
  if (combined.includes('/lb') || combined.includes('per lb')) return 'lb';
  if (combined.includes('/oz') || combined.includes('per oz')) return 'oz';
  if (combined.match(/\b(chicken|beef|pork|turkey|salmon|cod|shrimp|steak|roast|chop|fillet|lamb)\b/)) return 'lb';
  if (combined.match(/\b(egg)\b/)) return 'dozen';
  return 'each';
}

async function main() {
  console.log('=== OpenClaw Weekly Flyer Scraper ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const db = getDb();
  const cachedMappings = loadCachedMappings(db);

  let totalItems = 0;

  for (const source of FLYER_SOURCES) {
    console.log(`\n--- ${source.name} ---`);
    ensureSourceExists(db, source);

    const items = await scrapeFlyerHTML(source);
    let totalNew = 0, totalChanged = 0, totalUnchanged = 0, totalSkipped = 0;

    for (const item of items) {
      if (!isFoodItem(item.name)) { totalSkipped++; continue; }
      const normalized = normalizeByRules(item.name, cachedMappings);
      if (!normalized) { totalSkipped++; continue; }
      const priceCents = parsePriceCents(item.priceText);
      if (!priceCents || priceCents <= 0 || priceCents > 100000) { totalSkipped++; continue; }

      const unit = detectUnit(item.name, item.size);
      saveMapping(db, item.name, normalized.ingredientId, normalized.variantId, normalized.method, normalized.confidence);

      const result = upsertPrice(db, {
        sourceId: source.sourceId,
        canonicalIngredientId: normalized.ingredientId,
        variantId: normalized.variantId,
        rawProductName: item.name,
        priceCents,
        priceUnit: unit,
        pricePerStandardUnitCents: priceCents,
        standardUnit: unit,
        packageSize: item.size || null,
        priceType: 'sale',
        saleDates: { start: item.saleStart, end: item.saleEnd },
        pricingTier: 'retail',
        confidence: 'flyer_scrape',
        sourceUrl: source.flyerUrl,
      });

      if (result === 'new') totalNew++;
      else if (result === 'changed') totalChanged++;
      else totalUnchanged++;
    }

    db.prepare("UPDATE source_registry SET last_scraped_at = datetime('now') WHERE source_id = ?").run(source.sourceId);
    console.log(`  [${source.chain}] Results: New=${totalNew}, Changed=${totalChanged}, Unchanged=${totalUnchanged}, Skipped=${totalSkipped}`);
    totalItems += items.length;

    await rateLimitDelay();
  }

  console.log(`\n=== Flyer Scraper Done (${totalItems} total items found) ===`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
