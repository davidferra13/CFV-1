/**
 * OpenClaw - Store Location Ingestion Pipeline
 *
 * Pulls every food retail location in America from OpenStreetMap
 * and ingests them into openclaw.stores with name, address, lat/lng,
 * and source type classification.
 *
 * OpenStreetMap has:
 *   - Every supermarket, convenience store, grocery store
 *   - Names, brands, addresses, coordinates
 *   - Free, no API key, complete coverage
 *
 * Strategy: Query state by state (US has 50 states + DC).
 * Each state query returns all food retail nodes/ways.
 * We classify each by shop type and brand into our source_type taxonomy.
 *
 * Usage:
 *   node scripts/ingest-store-locations.mjs                 # all states
 *   node scripts/ingest-store-locations.mjs --state SC      # single state
 *   node scripts/ingest-store-locations.mjs --state SC,NC   # multiple states
 */

import { getDb } from '../lib/db.mjs';
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming','District of Columbia',
];

const STATE_ABBREVS = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS',
  'Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA',
  'Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT',
  'Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM',
  'New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK',
  'Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC',
  'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT',
  'Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
  'District of Columbia':'DC',
};

// OSM shop types we care about
const SHOP_TYPES = ['supermarket', 'convenience', 'grocery', 'greengrocer', 'farm', 'deli', 'butcher', 'seafood', 'bakery', 'cheese'];

// Map OSM shop types to our source_type taxonomy
function classifyStore(tags) {
  const shop = tags.shop || '';
  const brand = (tags.brand || '').toLowerCase();
  const name = (tags.name || '').toLowerCase();

  // Dollar stores
  if (brand.includes('dollar general') || brand.includes('dollar tree') ||
      brand.includes('family dollar') || name.includes('dollar general') ||
      name.includes('dollar tree') || name.includes('family dollar')) {
    return 'dollar';
  }

  // Convenience stores
  if (shop === 'convenience' || brand.includes('7-eleven') || brand.includes('circle k') ||
      brand.includes('wawa') || brand.includes('sheetz') || brand.includes('casey') ||
      brand.includes('speedway') || brand.includes('cumberland') || brand.includes('quiktrip') ||
      brand.includes('racetrac') || brand.includes('kwik trip') || brand.includes('royal farms')) {
    return 'convenience';
  }

  // Warehouse clubs
  if (brand.includes('costco') || brand.includes('sam\'s club') || brand.includes('bj\'s')) {
    return 'club';
  }

  // Specialty / ethnic
  if (shop === 'greengrocer' || shop === 'butcher' || shop === 'seafood' ||
      shop === 'cheese' || shop === 'bakery' || shop === 'deli' ||
      brand.includes('h mart') || brand.includes('99 ranch') ||
      brand.includes('patel brothers') || name.includes('halal') ||
      name.includes('asian') || name.includes('hispanic') || name.includes('mercado') ||
      name.includes('carniceria') || name.includes('tienda') || name.includes('oriental')) {
    return 'specialty';
  }

  // Farms
  if (shop === 'farm' || name.includes('farm stand') || name.includes('farmer')) {
    return 'farm';
  }

  // Check if it's a known chain
  const knownChains = [
    'kroger','walmart','target','publix','safeway','albertsons','aldi',
    'whole foods','trader joe','wegmans','food lion','harris teeter',
    'stop & shop','hannaford','shaw','meijer','hy-vee','h-e-b',
    'giant','shoprite','sprouts','winco','fred meyer','ralphs',
    'vons','jewel','acme','king soopers','smith\'s','ingles',
    'piggly wiggly','winn-dixie','food city','stater bros',
  ];
  if (knownChains.some(c => brand.includes(c) || name.includes(c))) {
    return 'chain';
  }

  // Default: if it's a supermarket/grocery, call it independent
  if (shop === 'supermarket' || shop === 'grocery') {
    return brand ? 'chain' : 'independent';
  }

  return 'independent';
}

// Match to existing chain in our DB
function matchChainSlug(tags) {
  const brand = (tags.brand || tags['brand:wikidata'] || '').toLowerCase();
  const name = (tags.name || '').toLowerCase();
  const combined = brand + ' ' + name;

  const chainMap = [
    [/kroger/i, 'kroger'], [/walmart|wal-mart/i, 'walmart'], [/target/i, 'target'],
    [/publix/i, 'publix'], [/safeway/i, 'safeway'], [/albertsons/i, 'albertsons'],
    [/aldi/i, 'aldi'], [/whole foods/i, 'whole_foods'], [/trader joe/i, 'trader_joes'],
    [/wegmans/i, 'wegmans'], [/food lion/i, 'food_lion'], [/harris teeter/i, 'harris_teeter'],
    [/stop.{0,3}shop/i, 'stop_and_shop'], [/hannaford/i, 'hannaford'],
    [/shaw.?s/i, 'shaws'], [/meijer/i, 'meijer'], [/hy.?vee/i, 'hy_vee'],
    [/h.?e.?b/i, 'heb'], [/giant eagle/i, 'giant_eagle'], [/giant/i, 'giant_food'],
    [/shoprite/i, 'shoprite'], [/sprouts/i, 'sprouts'], [/winco/i, 'winco'],
    [/fred meyer/i, 'fred_meyer'], [/ralphs/i, 'ralphs'], [/vons/i, 'vons'],
    [/jewel/i, 'jewel_osco'], [/acme/i, 'acme'], [/king soopers/i, 'king_soopers'],
    [/smith.?s/i, 'smiths'], [/ingles/i, 'ingles'], [/piggly/i, 'piggly_wiggly'],
    [/winn.?dixie/i, 'winn_dixie'], [/food city/i, 'food_city'],
    [/stater/i, 'stater_bros'], [/costco/i, 'costco'], [/sam.?s club/i, 'sams_club'],
    [/bj.?s/i, 'bjs'], [/dollar general/i, 'dollar_general'],
    [/dollar tree/i, 'dollar_tree'], [/family dollar/i, 'family_dollar'],
    [/7.?eleven/i, '7_eleven'], [/circle k/i, 'circle_k'],
    [/wawa/i, 'wawa'], [/sheetz/i, 'sheetz'], [/casey/i, 'caseys'],
    [/food 4 less|food4less/i, 'food_4_less'], [/fry.?s/i, 'frys_food'],
    [/mariano/i, 'marianos'], [/pick.?n.?save/i, 'pick_n_save'],
    [/qfc/i, 'qfc'], [/dillons/i, 'dillons'], [/city market/i, 'city_market'],
    [/lowes food|lowe.?s food/i, 'lowes_foods'], [/lidl/i, 'lidl'],
    [/price chopper/i, 'price_chopper'], [/big y/i, 'big_y'],
    [/market basket/i, 'market_basket'], [/schnucks/i, 'schnucks'],
    [/earth fare/i, 'earth_fare'], [/fresh thyme/i, 'fresh_thyme'],
    [/natural grocer/i, 'natural_grocers'], [/fresh market/i, 'the_fresh_market'],
    [/h mart/i, 'hmart'], [/99 ranch/i, '99_ranch'],
    [/restaurant depot/i, 'restaurant_depot'],
    [/cvs/i, 'cvs'], [/walgreens/i, 'walgreens'],
    [/rite aid/i, 'rite_aid'], [/speedway/i, 'speedway'],
  ];

  for (const [pattern, slug] of chainMap) {
    if (pattern.test(combined)) return slug;
  }
  return null;
}

async function queryState(stateName) {
  const abbrev = STATE_ABBREVS[stateName];
  const shopFilter = SHOP_TYPES.map(t => `["shop"="${t}"]`).join('');

  // Build Overpass query - split into manageable batches to avoid timeouts
  // Batch 1: supermarket + convenience (highest volume)
  // Batch 2: everything else
  const batch1 = ['supermarket', 'convenience'];
  const batch2 = SHOP_TYPES.filter(t => !batch1.includes(t));

  const buildQuery = (types) => `[out:json][timeout:180];
area["name"="${stateName}"]["admin_level"="4"]->.state;
(
  ${types.map(t => `node["shop"="${t}"](area.state);`).join('\n  ')}
  ${types.map(t => `way["shop"="${t}"](area.state);`).join('\n  ')}
);
out center;`;

  const query = buildQuery(batch1);

  // Batch 1: supermarkets + convenience
  const res1 = await fetch(OVERPASS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res1.ok) throw new Error(`Overpass error ${res1.status} for ${stateName} (batch 1)`);
  const data1 = await res1.json();

  // Wait between batches
  await new Promise(r => setTimeout(r, 3000));

  // Batch 2: specialty types
  const query2 = buildQuery(batch2);
  let data2Elements = [];
  try {
    const res2 = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query2)}`,
    });
    if (res2.ok) {
      const data2 = await res2.json();
      data2Elements = data2.elements || [];
    }
  } catch {} // non-critical batch

  return [...(data1.elements || []), ...data2Elements];
}

function ensureStoreLocationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS store_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      osm_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      chain_slug TEXT,
      source_type TEXT NOT NULL DEFAULT 'independent',
      shop_type TEXT,
      address TEXT,
      city TEXT,
      state TEXT NOT NULL,
      zip TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_store_loc_state ON store_locations(state);
    CREATE INDEX IF NOT EXISTS idx_store_loc_chain ON store_locations(chain_slug);
    CREATE INDEX IF NOT EXISTS idx_store_loc_type ON store_locations(source_type);
    CREATE INDEX IF NOT EXISTS idx_store_loc_geo ON store_locations(lat, lng);
  `);
}

async function ingestState(db, stateName) {
  const abbrev = STATE_ABBREVS[stateName];
  console.log(`  Querying OpenStreetMap for ${stateName} (${abbrev})...`);

  const elements = await queryState(stateName);
  console.log(`    Found ${elements.length} food retail locations`);

  if (elements.length === 0) return { inserted: 0, skipped: 0 };

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO store_locations
      (osm_id, name, brand, chain_slug, source_type, shop_type, address, city, state, zip, lat, lng, phone, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  let inserted = 0;
  let skipped = 0;

  const insertMany = db.transaction((els) => {
    for (const el of els) {
      const tags = el.tags || {};
      const name = tags.name;
      if (!name) { skipped++; continue; }

      const lat = el.lat || el.center?.lat;
      const lng = el.lon || el.center?.lon;
      if (!lat || !lng) { skipped++; continue; }

      const sourceType = classifyStore(tags);
      const chainSlug = matchChainSlug(tags);
      const osmId = `${el.type}-${el.id}`;
      const address = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || null;
      const city = tags['addr:city'] || '';
      const zip = tags['addr:postcode'] || '';
      const phone = tags.phone || null;

      try {
        stmt.run(osmId, name, tags.brand || null, chainSlug, sourceType, tags.shop, address, city || stateName, abbrev, zip, lat, lng, phone);
        inserted++;
      } catch {
        skipped++;
      }
    }
  });

  insertMany(elements);
  return { inserted, skipped };
}

async function main() {
  console.log('=== OpenClaw Store Location Ingestion ===');
  console.log(`Source: OpenStreetMap (Overpass API)`);
  console.log(`Time: ${new Date().toISOString()}`);

  const db = getDb();
  ensureStoreLocationsTable(db);

  const args = process.argv.slice(2);
  const stateArg = args.find(a => a.startsWith('--state='))?.split('=')[1];

  let statesToProcess;
  if (stateArg) {
    const codes = stateArg.split(',');
    statesToProcess = US_STATES.filter(s => codes.includes(STATE_ABBREVS[s]));
  } else {
    statesToProcess = US_STATES;
  }

  console.log(`States: ${statesToProcess.length}`);

  let grandInserted = 0;
  let grandSkipped = 0;

  for (let i = 0; i < statesToProcess.length; i++) {
    const state = statesToProcess[i];
    console.log(`\n[${i + 1}/${statesToProcess.length}] ${state}`);

    try {
      const { inserted, skipped } = await ingestState(db, state);
      grandInserted += inserted;
      grandSkipped += skipped;
      console.log(`    Inserted: ${inserted}, Skipped: ${skipped} (total: ${grandInserted})`);
    } catch (err) {
      console.error(`    ERROR: ${err.message}`);
    }

    // Rate limit: Overpass API asks for 1 request per 5 seconds
    if (i < statesToProcess.length - 1) {
      await new Promise(r => setTimeout(r, 6000));
    }
  }

  // Final count
  const total = db.prepare('SELECT count(*) as cnt FROM store_locations').get();
  const byType = db.prepare('SELECT source_type, count(*) as cnt FROM store_locations GROUP BY source_type ORDER BY cnt DESC').all();
  const byState = db.prepare('SELECT state, count(*) as cnt FROM store_locations GROUP BY state ORDER BY cnt DESC LIMIT 10').all();

  console.log('\n=== Complete ===');
  console.log(`Inserted: ${grandInserted}`);
  console.log(`Skipped: ${grandSkipped}`);
  console.log(`Total store locations: ${total.cnt}`);
  console.log('\nBy source type:');
  for (const r of byType) console.log(`  ${r.source_type}: ${r.cnt}`);
  console.log('\nTop 10 states:');
  for (const r of byState) console.log(`  ${r.state}: ${r.cnt}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
