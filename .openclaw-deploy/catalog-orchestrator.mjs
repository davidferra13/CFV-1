/**
 * OpenClaw - Catalog Orchestrator
 * Runs the Instacart catalog walker across ALL stores in ALL chains.
 * Designed for nohup/cron on the Pi. Runs for hours/days unattended.
 *
 * Strategy:
 * - Picks stores that haven't been cataloged (or cataloged longest ago)
 * - Runs one store at a time (sequential, not parallel - avoid rate limits)
 * - Uses geographic proximity to minimize Instacart session token changes
 * - Logs progress to stdout and updates the DB
 *
 * Usage:
 *   node catalog-orchestrator.mjs [--chain market-basket] [--state MA] [--max-stores 10]
 *   node catalog-orchestrator.mjs --all   # run everything
 *
 * Instacart serves the SAME inventory for all stores in a zone/region,
 * so we pick ONE representative store per geographic cluster (within 15 miles)
 * to avoid redundant crawls. Each unique lat/lng zone gets one crawl.
 */

import { getDb } from '../lib/db.mjs';
import { initCatalogSchema } from '../lib/catalog-db.mjs';
import { execFileSync, spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WALKER_PATH = join(__dirname, 'instacart-catalog-walker.mjs');

// Instacart slug -> our chain_slug mapping
const CHAIN_MAP = {
  'market-basket': 'market_basket',
  'hannaford': 'hannaford',
  'shaws': 'shaws',
  'aldi': 'aldi',
  'whole-foods': 'whole_foods',
  'stop-and-shop': 'stop_and_shop',
};

// Reverse: chain_slug -> instacart slug
const REVERSE_MAP = Object.fromEntries(
  Object.entries(CHAIN_MAP).map(([k, v]) => [v, k])
);

// Chains to crawl in priority order (most stores first)
const CHAIN_PRIORITY = [
  'market_basket', 'hannaford', 'shaws', 'whole_foods', 'aldi', 'stop_and_shop'
];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { chain: null, state: null, maxStores: Infinity, all: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--chain' && args[i + 1]) opts.chain = args[++i];
    else if (args[i] === '--state' && args[i + 1]) opts.state = args[++i].toUpperCase();
    else if (args[i] === '--max-stores' && args[i + 1]) opts.maxStores = parseInt(args[++i]);
    else if (args[i] === '--all') opts.all = true;
  }
  return opts;
}

/**
 * Cluster stores by geographic proximity. Instacart serves the same inventory
 * for stores within ~15 miles, so we only need to crawl one per cluster.
 * Returns the centroid store for each cluster.
 */
function clusterStores(stores, radiusMiles = 15) {
  const toRad = d => d * Math.PI / 180;
  const dist = (a, b) => {
    const R = 3959; // Earth radius in miles
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };

  const claimed = new Set();
  const representatives = [];

  // Sort by last_cataloged_at (null first = never cataloged = highest priority)
  const sorted = [...stores].sort((a, b) => {
    if (!a.last_cataloged_at && b.last_cataloged_at) return -1;
    if (a.last_cataloged_at && !b.last_cataloged_at) return 1;
    if (!a.last_cataloged_at && !b.last_cataloged_at) return 0;
    return new Date(a.last_cataloged_at) - new Date(b.last_cataloged_at);
  });

  for (const store of sorted) {
    if (claimed.has(store.id)) continue;

    // This store becomes the representative for its cluster
    representatives.push(store);
    claimed.add(store.id);

    // Claim all nearby stores
    for (const other of sorted) {
      if (claimed.has(other.id)) continue;
      if (dist(store, other) <= radiusMiles) {
        claimed.add(other.id);
      }
    }
  }

  return representatives;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Run the walker for a single store. Returns a promise that resolves when done.
 */
function runWalker(instacartSlug, lat, lng) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [WALKER_PATH, instacartSlug, String(lat), String(lng)], {
      cwd: join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', d => {
      const line = d.toString();
      stdout += line;
      // Forward progress lines to our stdout
      process.stdout.write(line);
    });
    child.stderr.on('data', d => {
      stderr += d.toString();
      process.stderr.write(d.toString());
    });

    child.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`Walker exited with code ${code}: ${stderr.slice(-500)}`));
    });

    child.on('error', reject);
  });
}

/**
 * Check if session cookies are still fresh enough for a full store crawl (~60 min).
 * Returns true if session has at least 2 hours of life left.
 */
function isSessionFresh() {
  const sessionPaths = [
    join(__dirname, '..', 'data', 'captured-session.json'),
    join(__dirname, '..', 'data', 'instacart-session.json'),
  ];
  for (const p of sessionPaths) {
    try {
      const session = JSON.parse(readFileSync(p, 'utf8'));
      const ageHours = (Date.now() - session.timestamp) / 3600000;
      console.log(`[session] Age: ${ageHours.toFixed(1)}h (from ${p.split('/').pop()})`);
      // Consider fresh if under 4 hours (conservative; sessions last 6-12h)
      return ageHours < 4;
    } catch {}
  }
  return false;
}

async function main() {
  const opts = parseArgs();
  const db = getDb();
  initCatalogSchema(db);

  console.log('=== OpenClaw Catalog Orchestrator ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Options: chain=${opts.chain || 'all'}, state=${opts.state || 'all'}, maxStores=${opts.maxStores}`);

  // Determine which chains to process
  const chains = opts.chain
    ? [CHAIN_MAP[opts.chain] || opts.chain]
    : CHAIN_PRIORITY;

  let totalStoresProcessed = 0;
  let totalProductsAdded = 0;
  let totalErrors = 0;

  for (const chainSlug of chains) {
    const instacartSlug = REVERSE_MAP[chainSlug];
    if (!instacartSlug) {
      console.log(`[skip] No Instacart slug for chain: ${chainSlug}`);
      continue;
    }

    // Get all stores for this chain
    let query = 'SELECT * FROM catalog_stores WHERE chain_slug = ? AND lat IS NOT NULL';
    const params = [chainSlug];
    if (opts.state) {
      query += ' AND state = ?';
      params.push(opts.state);
    }

    const allStores = db.prepare(query).all(...params);
    if (allStores.length === 0) {
      console.log(`[skip] No stores for ${chainSlug}${opts.state ? ' in ' + opts.state : ''}`);
      continue;
    }

    // Cluster to avoid redundant crawls
    const representatives = clusterStores(allStores);
    console.log(`\n[${chainSlug}] ${allStores.length} stores -> ${representatives.length} geographic clusters`);

    for (let i = 0; i < representatives.length && totalStoresProcessed < opts.maxStores; i++) {
      const store = representatives[i];
      console.log(`\n--- [${totalStoresProcessed + 1}] ${store.name}, ${store.city}, ${store.state} (${instacartSlug}) ---`);

      // Check session freshness before each store
      if (!isSessionFresh()) {
        console.error('[STOP] Session cookies expired or too old (>4 hours).');
        console.error('Run capture-instacart-v3.mjs on PC, SCP to Pi, then re-run orchestrator.');
        console.error(`Resume with: node scrapers/catalog-orchestrator.mjs --chain ${instacartSlug} --max-stores ${opts.maxStores - totalStoresProcessed}`);
        break;
      }

      try {
        await runWalker(instacartSlug, store.lat, store.lng);
        totalStoresProcessed++;
        console.log(`[done] ${store.name}`);
      } catch (err) {
        console.error(`[error] ${store.name}: ${err.message}`);
        totalErrors++;

        // If we get a session error, stop (cookies expired)
        if (err.message.includes('session') || err.message.includes('Session') ||
            err.message.includes('expired') || err.message.includes('401') ||
            err.message.includes('403')) {
          console.error('[FATAL] Session appears expired. Stopping orchestrator.');
          console.error('Run capture-instacart-v3.mjs on PC and SCP cookies to Pi.');
          break;
        }
      }

      // Cool down between stores (30 seconds)
      if (i < representatives.length - 1) {
        console.log('[cooldown] 30s between stores...');
        await sleep(30000);
      }
    }
  }

  // Final report
  const stats = db.prepare('SELECT COUNT(*) as products FROM catalog_products').get();
  const priceStats = db.prepare('SELECT COUNT(*) as prices FROM catalog_store_products').get();
  const storeStats = db.prepare("SELECT COUNT(DISTINCT store_id) as stores FROM catalog_store_products").get();

  console.log('\n=== Orchestrator Complete ===');
  console.log(`Stores processed: ${totalStoresProcessed}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Catalog: ${stats.products} products, ${priceStats.prices} store-prices, ${storeStats.stores} stores with data`);
  console.log(`Time: ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
