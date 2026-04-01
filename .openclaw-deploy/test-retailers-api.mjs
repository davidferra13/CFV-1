/**
 * Analyze the /v3/retailers API response.
 * Does it contain shop IDs, zone IDs, or location data we can use?
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const session = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'captured-session.json'), 'utf8'));
const cookies = session.cookies;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function main() {
  const res = await fetch('https://www.instacart.com/v3/retailers?postal_code=01906', {
    headers: { 'User-Agent': UA, 'Cookie': cookies, 'Accept': 'application/json' },
  });

  const data = await res.json();
  const retailers = data.retailers || [];

  console.log(`Total retailers: ${retailers.length}`);
  console.log('\nFirst 5 retailers:');
  for (const r of retailers.slice(0, 5)) {
    console.log(`  id=${r.id} slug=${r.slug} name=${r.name}`);
    // Check all keys for zone/shop data
    const allKeys = Object.keys(r);
    const interestingKeys = allKeys.filter(k =>
      k.includes('zone') || k.includes('shop') || k.includes('location') ||
      k.includes('address') || k.includes('lat') || k.includes('lng') ||
      k.includes('postal') || k.includes('warehouse')
    );
    if (interestingKeys.length) console.log(`    Interesting keys: ${interestingKeys.join(', ')}`);
  }

  // Find costco
  const costco = retailers.find(r => r.slug === 'costco');
  if (costco) {
    console.log('\n\nCostco full object keys:', Object.keys(costco));
    console.log('Costco details:', JSON.stringify(costco, null, 2).substring(0, 2000));
  }

  // Check if there's a "shops" or "warehouses" array
  console.log('\n\nTop-level response keys:', Object.keys(data));
  if (data.shops) console.log('Shops:', JSON.stringify(data.shops).substring(0, 500));
  if (data.warehouses) console.log('Warehouses:', JSON.stringify(data.warehouses).substring(0, 500));
  if (data.zones) console.log('Zones:', JSON.stringify(data.zones).substring(0, 500));

  // Look for any retailer with location/zone data
  const withLocation = retailers.filter(r =>
    r.address || r.location || r.lat || r.zone_id || r.shop_id || r.warehouse_id
  );
  console.log(`\nRetailers with location data: ${withLocation.length}`);
}

main().catch(e => console.error(e));
