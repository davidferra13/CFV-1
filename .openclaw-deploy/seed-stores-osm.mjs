/**
 * OpenClaw - Seed Store Registry from OpenStreetMap
 * Uses Overpass API to find all grocery stores in MA, NH, ME.
 * Free, reliable, structured data with addresses and coordinates.
 *
 * Usage: node scrapers/seed-stores-osm.mjs
 */

import { getDb } from '../lib/db.mjs';
import { initCatalogSchema, upsertStore, getCatalogStats } from '../lib/catalog-db.mjs';

const TARGET_STATES = ['Massachusetts', 'New Hampshire', 'Maine'];
const STATE_ABBREV = { 'Massachusetts': 'MA', 'New Hampshire': 'NH', 'Maine': 'ME' };

const CHAINS = [
  { slug: 'market_basket', pattern: 'Market Basket', name: 'Market Basket' },
  { slug: 'stop_and_shop', pattern: 'Stop.*Shop', name: 'Stop & Shop' },
  { slug: 'hannaford', pattern: 'Hannaford', name: 'Hannaford' },
  { slug: 'shaws', pattern: "Shaw.s", name: "Shaw's" },
  { slug: 'walmart', pattern: 'Walmart', name: 'Walmart' },
  { slug: 'target', pattern: 'Target$', name: 'Target' },
  { slug: 'whole_foods', pattern: 'Whole Foods', name: 'Whole Foods' },
  { slug: 'trader_joes', pattern: 'Trader Joe', name: "Trader Joe's" },
  { slug: 'aldi', pattern: '^Aldi$', name: 'Aldi' },
];

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

async function queryOverpass(stateName, namePattern) {
  const query = `[out:json][timeout:60];area[name="${stateName}"]->.a;(nwr["name"~"${namePattern}",i]["shop"](area.a););out center;`;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data.elements || [];
}

function extractStoreData(element, chainSlug, chainName, stateAbbrev) {
  const tags = element.tags || {};
  const lat = element.lat || element.center?.lat;
  const lon = element.lon || element.center?.lon;

  // Build address
  const street = tags['addr:street'] || '';
  const houseNumber = tags['addr:housenumber'] || '';
  const address = houseNumber ? `${houseNumber} ${street}` : street;
  const city = tags['addr:city'] || '';
  const state = tags['addr:state'] || stateAbbrev;
  const zip = tags['addr:postcode'] || '';

  // Skip if we don't have a city (required field)
  if (!city && !zip) return null;

  // Use OSM ID as external store ID (stable, unique)
  const externalId = `osm-${element.type}-${element.id}`;

  // Build store name
  const name = tags.name || chainName;
  const ref = tags.ref || tags['ref:store'] || '';
  const displayName = ref ? `${name} #${ref}` : name;

  return {
    chainSlug,
    externalStoreId: externalId,
    name: displayName,
    address: address || null,
    city: city || 'Unknown',
    state: state.toUpperCase().substring(0, 2),
    zip: zip || '00000',
    lat: lat || null,
    lng: lon || null,
    phone: tags.phone || tags['contact:phone'] || null,
    hoursJson: tags.opening_hours ? JSON.stringify({ raw: tags.opening_hours }) : null,
  };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== OpenClaw Store Seeder (OpenStreetMap) ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`States: ${TARGET_STATES.join(', ')}`);
  console.log(`Chains: ${CHAINS.map(c => c.name).join(', ')}`);

  const db = getDb();
  initCatalogSchema(db);

  let totalNew = 0;
  let totalUpdated = 0;

  for (const chain of CHAINS) {
    console.log(`\n--- ${chain.name} ---`);
    let chainNew = 0;
    let chainUpdated = 0;

    for (const stateName of TARGET_STATES) {
      const abbrev = STATE_ABBREV[stateName];
      try {
        console.log(`  Querying OSM for ${chain.name} in ${stateName}...`);
        const elements = await queryOverpass(stateName, chain.pattern);
        console.log(`  Found ${elements.length} results`);

        for (const elem of elements) {
          const store = extractStoreData(elem, chain.slug, chain.name, abbrev);
          if (!store) continue;

          // Validate state matches target
          if (!['MA', 'NH', 'ME'].includes(store.state)) continue;

          const result = upsertStore(db, store);
          if (result.isNew) chainNew++;
          else chainUpdated++;
        }
      } catch (err) {
        console.error(`  Error querying ${stateName}: ${err.message}`);
      }

      // Respect Overpass rate limits (1 req/sec)
      await sleep(2000);
    }

    console.log(`  ${chain.name}: ${chainNew} new, ${chainUpdated} updated`);
    totalNew += chainNew;
    totalUpdated += chainUpdated;
  }

  // Print summary
  const stats = getCatalogStats(db);
  console.log(`\n=== Summary ===`);
  console.log(`Total stores in DB: ${stats.stores}`);
  console.log(`New: ${totalNew} | Updated: ${totalUpdated}`);

  console.log('\nBy state:');
  const byState = db.prepare('SELECT state, COUNT(*) as c FROM catalog_stores GROUP BY state ORDER BY state').all();
  byState.forEach(r => console.log(`  ${r.state}: ${r.c}`));

  console.log('\nBy chain:');
  const byChain = db.prepare('SELECT chain_slug, COUNT(*) as c FROM catalog_stores GROUP BY chain_slug ORDER BY c DESC').all();
  byChain.forEach(r => console.log(`  ${r.chain_slug}: ${r.c}`));

  // Show some sample stores
  console.log('\nSample stores (first 10):');
  const samples = db.prepare('SELECT chain_slug, name, city, state, zip, lat, lng FROM catalog_stores ORDER BY chain_slug, city LIMIT 10').all();
  samples.forEach(s => console.log(`  ${s.chain_slug} | ${s.name} | ${s.city}, ${s.state} ${s.zip} | ${s.lat?.toFixed(4)},${s.lng?.toFixed(4)}`));
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
