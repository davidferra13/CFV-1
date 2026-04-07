/**
 * OpenClaw - Walmart Nationwide Scraper
 *
 * Wraps the existing Walmart scraper to run across 50+ stores
 * in all 50 states. Walmart is the #1 grocery retailer in America.
 *
 * Strategy: Walmart's search pages embed product JSON in __NEXT_DATA__.
 * HTTP-only, no Puppeteer needed. Set store context via cookie.
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { httpFetch, sleep } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings } from '../lib/normalize-rules.mjs';
import { WALMART_STORES, CHEF_SEARCH_TERMS } from './nationwide-config.mjs';

async function searchWalmart(keyword, storeId) {
  const url = `https://www.walmart.com/search?q=${encodeURIComponent(keyword)}&cat_id=976759&affinityOverride=default`;

  try {
    const res = await httpFetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Cookie': `walmart.nearestStoreId=${storeId}; walmart.shippingZip=; vtc=`,
      },
    });

    const html = await res.text();

    // Extract __NEXT_DATA__ JSON
    const match = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>(.+?)<\/script>/s);
    if (!match) return [];

    const nextData = JSON.parse(match[1]);
    const items = nextData?.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items || [];

    return items
      .filter(item => item.name && (item.priceInfo?.currentPrice?.price || item.priceInfo?.linePrice))
      .map(item => {
        const price = item.priceInfo?.currentPrice?.price || 0;
        const wasPrice = item.priceInfo?.wasPrice?.price;
        const unitPrice = item.priceInfo?.unitPrice;
        let unit = 'each';
        if (unitPrice?.unitOfMeasure) {
          const uom = unitPrice.unitOfMeasure.toLowerCase();
          if (uom.includes('ounce') || uom === 'oz') unit = 'oz';
          else if (uom.includes('pound') || uom === 'lb') unit = 'lb';
          else if (uom.includes('fluid')) unit = 'fl_oz';
        }

        return {
          name: item.name,
          priceCents: Math.round(price * 100),
          saleCents: wasPrice ? Math.round(price * 100) : null,
          unit,
          imageUrl: item.image || null,
        };
      })
      .filter(p => p.priceCents > 0 && p.priceCents < 100000 && isFoodItem(p.name));
  } catch {
    return [];
  }
}

async function main() {
  console.log('=== OpenClaw Walmart Nationwide Scraper ===');
  console.log(`Stores: ${WALMART_STORES.length}`);
  console.log(`Search terms: ${CHEF_SEARCH_TERMS.length}`);
  console.log(`Time: ${new Date().toISOString()}`);

  const db = getDb();
  const cachedMappings = loadCachedMappings(db);
  let grandTotal = 0;

  for (const store of WALMART_STORES) {
    const sourceId = `walmart-${store.state.toLowerCase()}-${store.zip}`;
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`WALMART: ${store.city}, ${store.state} (store ${store.storeId})`);
    console.log(`${'═'.repeat(50)}`);

    db.prepare(`
      INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, has_online_pricing, pricing_tier, status, notes)
      VALUES (?, ?, 'retail_chain', 'walmart', ?, 'html_parse', 1, 'retail', 'active', 'Walmart SSR HTML - __NEXT_DATA__ JSON extraction')
    `).run(sourceId, `Walmart (${store.city}, ${store.state})`, store.state);

    const seen = new Set();
    let storeTotal = 0;

    for (let i = 0; i < CHEF_SEARCH_TERMS.length; i++) {
      const term = CHEF_SEARCH_TERMS[i];
      const products = await searchWalmart(term, store.storeId);

      for (const p of products) {
        const key = `${p.name}:${p.priceCents}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const normalized = normalizeByRules(p.name, cachedMappings);
        if (normalized) {
          try { db.prepare('INSERT OR IGNORE INTO normalization_map (raw_name, canonical_ingredient_id, variant_id, method, confidence) VALUES (?, ?, ?, ?, ?)').run(p.name, normalized.ingredientId, normalized.variantId || 'default', normalized.method, normalized.confidence); } catch {}
        }

        const ingredientId = normalized?.ingredientId || (() => {
          const existing = db.prepare('SELECT ingredient_id FROM canonical_ingredients WHERE LOWER(name) = LOWER(?) LIMIT 1').get(p.name);
          if (existing) return existing.ingredient_id;
          const newId = `raw-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}`;
          try { db.prepare('INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category) VALUES (?, ?, ?)').run(newId, p.name, 'uncategorized'); } catch {}
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
          confidence: 'walmart_ssr',
          sourceUrl: `https://www.walmart.com/search?q=${encodeURIComponent(p.name)}`,
          imageUrl: p.imageUrl,
          brand: null,
          aisleCat: null,
        });
        storeTotal++;
      }

      if (i % 20 === 0 && i > 0) {
        console.log(`  [${i}/${CHEF_SEARCH_TERMS.length}] ${storeTotal} products`);
      }
      await sleep(2000 + Math.random() * 1000);
    }

    console.log(`  Total: ${storeTotal} products`);
    grandTotal += storeTotal;

    db.prepare("UPDATE source_registry SET last_scraped_at = datetime('now') WHERE source_id = ?").run(sourceId);
    await sleep(10000); // longer delay between Walmart stores (more aggressive blocking)
  }

  console.log(`\n=== Complete: ${grandTotal} products across ${WALMART_STORES.length} stores ===`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
