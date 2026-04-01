/**
 * Test: Can we get different postalCode results by passing different zip codes
 * to Instacart's GraphQL API using our existing NE session?
 *
 * If this works, we don't need separate sessions per zip at all.
 * We just need to override postalCode in the API calls.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const session = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'captured-session.json'), 'utf8'));
const cookies = session.cookies;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// These are the persisted query hashes from the walker
const COLLECTION_PRODUCTS_HASH = '5573f6ef85bfad81463b431985396705328c5ac3283c4e183aa36c6aad1afafe';
const ITEMS_HASH = '5116339819ff07f207fd38f949a8a7f58e52cc62223b535405b087e3076ebf2f';

async function testZip(postalCode, shopId, zoneId) {
  console.log(`\n--- Testing postalCode: ${postalCode} (shopId: ${shopId}, zoneId: ${zoneId}) ---`);

  const params = new URLSearchParams({
    operationName: 'CollectionProductsWithFeaturedProducts',
    variables: JSON.stringify({
      shopId,
      slug: 'produce',
      filters: [],
      pageViewId: crypto.randomUUID(),
      itemsDisplayType: 'collections_all_items_grid',
      first: 10,
      pageSource: 'collections',
      postalCode,
      zoneId,
    }),
    extensions: JSON.stringify({
      persistedQuery: { version: 1, sha256Hash: COLLECTION_PRODUCTS_HASH },
    }),
  });

  const url = `https://www.instacart.com/graphql?${params}`;
  console.log(`  Fetching produce department...`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Cookie': cookies,
        'Accept': 'application/json',
      },
    });

    console.log(`  Status: ${res.status}`);
    const text = await res.text();
    console.log(`  Response: ${text.length} bytes`);

    if (true) {
      try {
        const json = JSON.parse(text);
        const items = json?.data?.collectionProducts?.items || json?.data?.collection?.products?.items || [];
        console.log(`  Items in response: ${items.length}`);
        if (items.length > 0) {
          // Show first few items
          for (const item of items.slice(0, 3)) {
            const name = item?.name || item?.product?.name || 'unknown';
            const price = item?.pricing?.price || item?.price || '?';
            console.log(`    - ${name}: ${price}`);
          }
        }

        // Check for errors
        if (json.errors) {
          console.log(`  Errors: ${JSON.stringify(json.errors).substring(0, 200)}`);
        }
      } catch (e) {
        console.log(`  First 200 chars: ${text.substring(0, 200)}`);
      }
    }
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
}

// First, get our current context
console.log('=== Testing postalCode Override ===');
console.log('Session cookies: present');

// Get context from storefront
const res = await fetch('https://www.instacart.com/store/costco/storefront', {
  headers: { 'User-Agent': UA, 'Cookie': cookies },
});
const html = await res.text();

// Extract current values
const extract = (field) => {
  const patterns = [
    new RegExp(`${field}["']\\s*:\\s*["']([^"']+)["']`),
    new RegExp(`${field}%22%3A%22([^%&"]+)`),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
};

const currentShopId = extract('shopId');
const currentZoneId = extract('zoneId');
const currentPostalCode = extract('postalCode');

console.log(`\nCurrent context: shopId=${currentShopId}, zoneId=${currentZoneId}, postalCode=${currentPostalCode}`);

// Test with current values (baseline)
await testZip(currentPostalCode, currentShopId, currentZoneId);

// Test with NYC zip but same shopId/zoneId
// This tests: does the API return different results for different postal codes?
await testZip('10001', currentShopId, currentZoneId);

// Test with completely different zip
await testZip('90210', currentShopId, currentZoneId);

console.log('\n=== Done ===');
console.log('If results differ per zip, we can use postalCode override in the walker.');
console.log('If results are the same, the session/shopId locks the geographic area.');
