/**
 * OpenClaw - Instacart Department Walker
 * Uses CollectionProductsWithFeaturedProducts to get ALL items per department.
 * Then uses Items hash to get full details (name, price, size, brand).
 *
 * This replaces search-term guessing. Instead of 1,005 searches returning
 * ~3,000 products, this hits 20 departments and gets ALL 10,000+ items.
 *
 * Usage:
 *   node scrapers/instacart-department-walker.mjs market-basket [lat] [lng]
 */

import { getDb } from '../lib/db.mjs';
import {
  initCatalogSchema, upsertProduct, upsertStoreProduct,
  startScrapeRun, finishScrapeRun, getCatalogStats
} from '../lib/catalog-db.mjs';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SESSION_PATHS = [
  join(__dirname, '..', 'data', 'captured-session.json'),
  join(__dirname, '..', 'data', 'instacart-session.json'),
];

// Persisted query hashes (captured March 2026)
const COLLECTION_PRODUCTS_HASH = '5573f6ef85bfad81463b431985396705328c5ac3283c4e183aa36c6aad1afafe';
const ITEMS_HASH = '5116339819ff07f207fd38f949a8a7f58e52cc62223b535405b087e3076ebf2f';
const SEARCH_HASH = '95c5336c23ebbb52b5d5c63c28b0bb8ef1ae5adc191c334883b357a94701ff59';

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

const UA = 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function safeStr(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return null;
}

function loadSession() {
  for (const p of SESSION_PATHS) {
    try {
      const s = JSON.parse(readFileSync(p, 'utf8'));
      if (s.cookies) {
        console.log(`[session] Loaded from ${p.split('/').pop()}`);
        return s;
      }
    } catch {}
  }
  return null;
}

// ============================================================================
// SESSION CONTEXT
// ============================================================================

async function getSessionContext(session, storeSlug) {
  console.log('[session] Fetching store context...');
  const res = await fetch(`https://www.instacart.com/store/${storeSlug}/storefront`, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Cookie': session.cookies },
  });
  const html = await res.text();

  // Try multiple extraction patterns (HTML may have URL-encoded JSON, escaped JSON, or plain JSON)
  const extractField = (html, field) => {
    const patterns = [
      new RegExp(`${field}["']\\s*:\\s*["']([^"']+)["']`),           // plain JSON
      new RegExp(`${field}%22%3A%22([^%&"]+)`),                       // URL-encoded
      new RegExp(`${field}%5C%22%3A%5C%22([^%&"]+)`),                // double-encoded
      new RegExp(`${field}\\\\"%3A\\\\"([^%&"\\\\]+)`),              // mixed encoding
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m) return decodeURIComponent(m[1]);
    }
    return null;
  };

  const ctx = {
    shopId: extractField(html, 'shopId'),
    zoneId: extractField(html, 'zoneId'),
    sessionToken: extractField(html, 'retailerInventorySessionToken'),
    postalCode: extractField(html, 'postalCode') || '01830',
    cookies: session.cookies,
    ua: session.ua || UA,
  };

  console.log(`[session] shopId=${ctx.shopId}, zoneId=${ctx.zoneId}, token=${ctx.sessionToken ? 'yes' : 'NO'}`);
  return ctx;
}

// ============================================================================
// API CALLS
// ============================================================================

async function fetchDepartmentItemIds(ctx, storeSlug, departmentSlug) {
  const params = new URLSearchParams({
    operationName: 'CollectionProductsWithFeaturedProducts',
    variables: JSON.stringify({
      shopId: ctx.shopId,
      slug: departmentSlug,
      filters: [],
      pageViewId: crypto.randomUUID(),
      itemsDisplayType: 'collections_all_items_grid',
      first: 100,
      pageSource: 'collections',
      postalCode: ctx.postalCode,
      zoneId: ctx.zoneId,
    }),
    extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: COLLECTION_PRODUCTS_HASH } }),
  });

  const res = await fetch(`https://www.instacart.com/graphql?${params}`, {
    headers: {
      'User-Agent': ctx.ua,
      'Accept': 'application/json',
      'Cookie': ctx.cookies,
      'Referer': `https://www.instacart.com/store/${storeSlug}/collections/${departmentSlug}`,
    },
  });

  if (res.status !== 200) throw new Error(`HTTP ${res.status} for ${departmentSlug}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');

  const cp = data.data?.collectionProducts;
  const departmentName = cp?.collection?.name || departmentSlug;
  const itemIds = cp?.itemIds || [];

  return { departmentName, itemIds };
}

async function fetchItemsBatch(ctx, itemIds) {
  const params = new URLSearchParams({
    operationName: 'Items',
    variables: JSON.stringify({ ids: itemIds }),
    extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: ITEMS_HASH } }),
  });

  const res = await fetch(`https://www.instacart.com/graphql?${params}`, {
    headers: {
      'User-Agent': ctx.ua,
      'Accept': 'application/json',
      'Cookie': ctx.cookies,
      'Referer': 'https://www.instacart.com/store/market-basket/storefront',
    },
  });

  if (res.status !== 200) return {};
  const data = await res.json();
  if (data.errors) return {};

  const items = data.data?.items || [];
  const result = {};
  for (const item of items) {
    if (!item || !item.name) continue;
    const vs = item.viewSection || {};
    const priceVs = item.price?.viewSection || {};
    result[item.id] = {
      id: item.id,
      name: item.name,
      brand: safeStr(vs.itemBrand?.brandName) || safeStr(item.brand) || null,
      price: priceVs.priceString || priceVs.priceValueString || '',
      size: safeStr(vs.itemString) || null,
      imageUrl: safeStr(vs.itemImage?.templateUrl || vs.itemTransparentImage?.templateUrl) || null,
      inStock: item.availabilityStatus !== 'out_of_stock',
    };
  }
  return result;
}

// ============================================================================
// PROCESSING
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

function processAndStore(db, storeId, product, markupPct, department) {
  const priceCents = parsePriceCents(product.price);
  if (!priceCents || priceCents <= 0 || priceCents > 500000) return null;

  const adjustedPrice = adjustForMarkup(priceCents, markupPct);
  const sizeStr = safeStr(product.size);
  const { value: sizeValue, unit: sizeUnit } = parseSize(sizeStr);
  const nameStr = safeStr(product.name) || 'Unknown';
  const brandStr = safeStr(product.brand);
  const imageStr = product.imageUrl ? safeStr(product.imageUrl).replace('{width=}x{height=}', '200x200') : null;

  const prodResult = upsertProduct(db, {
    name: nameStr,
    brand: brandStr || null,
    upc: null,
    size: (sizeStr && sizeStr !== 'Item') ? sizeStr : null,
    sizeValue, sizeUnit,
    category: department,
    department: department,
    isFood: true,
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
    source: 'instacart-dept',
  });

  return { productIsNew: prodResult.isNew, priceResult };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('=== OpenClaw Instacart Department Walker ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const args = process.argv.slice(2);
  const instacartSlug = args[0];
  if (!instacartSlug) {
    console.log('Usage: node instacart-department-walker.mjs <slug> [lat] [lng]');
    console.log('  Slugs: ' + Object.keys(INSTACART_CHAINS).join(', '));
    process.exit(0);
  }

  const chainConfig = INSTACART_CHAINS[instacartSlug];
  if (!chainConfig) {
    console.error(`Unknown slug: ${instacartSlug}`);
    process.exit(1);
  }

  const lat = parseFloat(args[1]) || 42.7762;
  const lng = parseFloat(args[2]) || -71.0773;

  console.log(`Chain: ${chainConfig.name}, Markup: ${chainConfig.markupPct}%`);

  const session = loadSession();
  if (!session) { console.error('No session found.'); process.exit(1); }

  const ctx = await getSessionContext(session, chainConfig.storeSlug);
  if (!ctx?.shopId) { console.error('Could not get session context.'); process.exit(1); }

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
    scraperName: 'instacart-department-walker', scope: 'full',
  });

  // Department slugs for Market Basket (will work for most chains)
  const departments = [
    'produce', 'meat-and-seafood', 'dairy', 'snacks-and-candy',
    'frozen', 'beverages', '3089-deli', 'household', 'baked-goods',
    'canned-goods', '3095-prepared-foods', 'dry-goods-pasta',
    'breakfast-foods', 'condiments-sauces', 'baking-essentials',
    'oils-vinegars-spices', 'pets', 'personal-care', 'kitchen-supplies',
    'health-care',
  ];

  let totalProducts = 0, totalNew = 0, totalChanged = 0, totalErrors = 0;

  for (let d = 0; d < departments.length; d++) {
    const deptSlug = departments[d];
    console.log(`\n[${d + 1}/${departments.length}] Department: ${deptSlug}`);

    try {
      // Step 1: Get all item IDs for this department
      const { departmentName, itemIds } = await fetchDepartmentItemIds(ctx, chainConfig.storeSlug, deptSlug);
      console.log(`  ${departmentName}: ${itemIds.length} items`);

      if (itemIds.length === 0) continue;

      // Step 2: Fetch items in batches of 8 (Instacart's batch size)
      const BATCH_SIZE = 8;
      let deptNew = 0, deptStored = 0;

      for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
        const batch = itemIds.slice(i, i + BATCH_SIZE);
        try {
          const items = await fetchItemsBatch(ctx, batch);

          for (const item of Object.values(items)) {
            const result = processAndStore(db, storeId, item, chainConfig.markupPct, departmentName);
            if (!result) continue;
            totalProducts++;
            deptStored++;
            if (result.productIsNew) { totalNew++; deptNew++; }
            if (result.priceResult === 'changed') totalChanged++;
          }
        } catch (err) {
          totalErrors++;
        }

        // Rate limiting: 1-2s between batches
        await sleep(1000 + Math.random() * 1000);

        // Progress every 5 batches
        if (i > 0 && (i / BATCH_SIZE) % 5 === 0) {
          console.log(`    batch ${i / BATCH_SIZE}/${Math.ceil(itemIds.length / BATCH_SIZE)} | stored:${deptStored} new:${deptNew}`);
        }
      }

      console.log(`  => stored:${deptStored} new:${deptNew}`);
    } catch (err) {
      console.error(`  [error] ${deptSlug}: ${err.message}`);
      totalErrors++;
    }

    // Cooldown between departments
    await sleep(3000);
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
  const byDept = db.prepare('SELECT department, COUNT(*) as c FROM catalog_products GROUP BY department ORDER BY c DESC LIMIT 25').all();
  console.log('\nBy department:');
  byDept.forEach(d => console.log(`  ${d.department}: ${d.c}`));
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
