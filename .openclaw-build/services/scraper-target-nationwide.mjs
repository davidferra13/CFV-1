/**
 * OpenClaw - Target Nationwide Scraper
 *
 * Wraps the existing Target Redsky API scraper to run across
 * 24 stores in 24 states. No auth required. HTTP-only.
 *
 * The Redsky API is free, public, and doesn't block.
 * 2,314 products per store (based on existing runs).
 * 24 stores = ~55,000 price observations per run.
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { httpFetch, sleep } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings } from '../lib/normalize-rules.mjs';
import { TARGET_STORES, CHEF_SEARCH_TERMS } from './nationwide-config.mjs';

const REDSKY_BASE = 'https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2';
const REDSKY_KEY = '9f36aeafbe60771e321a7cc95a78140772ab3e96';
const PAGE_SIZE = 24;

async function searchTarget(keyword, storeId, pageOffset = 0) {
  const params = new URLSearchParams({
    key: REDSKY_KEY,
    channel: 'WEB',
    count: String(PAGE_SIZE),
    default_purchasability_filter: 'true',
    include_dmc_data: 'true',
    keyword,
    offset: String(pageOffset * PAGE_SIZE),
    page: `/s/${keyword}`,
    platform: 'desktop',
    pricing_store_id: storeId,
    scheduled_delivery_store_id: storeId,
    store_ids: storeId,
    useragent: 'Mozilla/5.0',
    visitor_id: 'openclaw',
  });

  try {
    const res = await httpFetch(`${REDSKY_BASE}?${params}`, {
      headers: { 'Accept': 'application/json' },
    });
    return await res.json();
  } catch {
    return null;
  }
}

function extractProducts(data) {
  const products = [];
  const results = data?.data?.search?.products || [];

  for (const item of results) {
    const name = item.item?.product_description?.title;
    const price = item.price?.current_retail || item.price?.reg_retail;
    if (!name || !price) continue;
    if (!isFoodItem(name)) continue;

    const priceCents = Math.round(price * 100);
    if (priceCents <= 0 || priceCents > 100000) continue;

    const unitPrice = item.price?.formatted_unit_price;
    let unit = 'each';
    if (unitPrice) {
      if (unitPrice.includes('/lb')) unit = 'lb';
      else if (unitPrice.includes('/oz')) unit = 'oz';
      else if (unitPrice.includes('/fl oz')) unit = 'fl_oz';
    }

    const imageUrl = item.item?.enrichment?.images?.primary_image_url || null;
    const saleCents = item.price?.current_retail !== item.price?.reg_retail
      ? Math.round((item.price?.current_retail || 0) * 100) : null;

    products.push({ name, priceCents, saleCents, unit, imageUrl });
  }
  return products;
}

async function main() {
  console.log('=== OpenClaw Target Nationwide Scraper ===');
  console.log(`Stores: ${TARGET_STORES.length}`);
  console.log(`Search terms: ${CHEF_SEARCH_TERMS.length}`);
  console.log(`Time: ${new Date().toISOString()}`);

  const db = getDb();
  const cachedMappings = loadCachedMappings(db);
  let grandTotal = 0;

  for (const store of TARGET_STORES) {
    const sourceId = `target-${store.state.toLowerCase()}-${store.zip}`;
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`TARGET: ${store.city}, ${store.state} (store ${store.storeId})`);
    console.log(`${'═'.repeat(50)}`);

    db.prepare(`
      INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, has_online_pricing, pricing_tier, status, notes)
      VALUES (?, ?, 'retail_chain', 'target', ?, 'redsky_api', 1, 'retail', 'active', 'Target Redsky API - no auth, real prices')
    `).run(sourceId, `Target (${store.city}, ${store.state})`, store.state);

    const seen = new Set();
    let storeTotal = 0;

    for (let i = 0; i < CHEF_SEARCH_TERMS.length; i++) {
      const term = CHEF_SEARCH_TERMS[i];
      const data = await searchTarget(term, store.storeId);
      if (!data) continue;

      const products = extractProducts(data);
      for (const p of products) {
        const key = `${p.name}:${p.priceCents}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const normalized = normalizeByRules(p.name, cachedMappings);
        if (normalized) {
          try { db.prepare('INSERT OR IGNORE INTO normalization_map (raw_name, canonical_ingredient_id, variant_id, method, confidence) VALUES (?, ?, ?, ?, ?)').run(p.name, normalized.ingredientId, normalized.variantId || 'default', normalized.method, normalized.confidence); } catch {}
        }

        // canonical_ingredient_id is NOT NULL in the DB - use a placeholder if no match
        const ingredientId = normalized?.ingredientId || (() => {
          // Create or find a raw ingredient entry
          const existing = db.prepare('SELECT ingredient_id FROM canonical_ingredients WHERE LOWER(name) = LOWER(?) LIMIT 1').get(p.name);
          if (existing) return existing.ingredient_id;
          const newId = `raw-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}`;
          try {
            db.prepare('INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category) VALUES (?, ?, ?)').run(newId, p.name, 'uncategorized');
          } catch {}
          return newId;
        })();

        upsertPrice(db, {
          sourceId,
          canonicalIngredientId: ingredientId,
          variantId: normalized?.variantId || 'default',
          rawProductName: p.name,
          priceCents: p.priceCents,
          priceUnit: p.unit,
          pricePerStandardUnitCents: p.priceCents,
          standardUnit: p.unit,
          packageSize: null,
          priceType: p.saleCents ? 'sale' : 'regular',
          pricingTier: 'retail',
          confidence: 'target_redsky',
          sourceUrl: `https://www.target.com/s/${encodeURIComponent(p.name)}`,
          imageUrl: p.imageUrl,
          brand: null,
          aisleCat: null,
        });
        storeTotal++;
      }

      if (i % 20 === 0 && i > 0) {
        console.log(`  [${i}/${CHEF_SEARCH_TERMS.length}] ${storeTotal} products`);
      }
      await sleep(800 + Math.random() * 400);
    }

    console.log(`  Total: ${storeTotal} products`);
    grandTotal += storeTotal;

    db.prepare("UPDATE source_registry SET last_scraped_at = datetime('now') WHERE source_id = ?").run(sourceId);
    await sleep(5000); // between stores
  }

  console.log(`\n=== Complete: ${grandTotal} products across ${TARGET_STORES.length} stores ===`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
