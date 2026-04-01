/**
 * Test: Can we discover shopId/zoneId for any postal code
 * using Instacart's GraphQL API?
 *
 * The walker intercepts showed several promising queries:
 * - DefaultShop (takes postalCode)
 * - ShopCollectionUnscoped (takes postalCode)
 * - GeolocationFromIp
 *
 * If DefaultShop returns different shopIds for different zips,
 * we can override shopId/zoneId in the walker without proxies.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const session = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'captured-session.json'), 'utf8'));
const cookies = session.cookies;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function tryQuery(operationName, variables, label) {
  console.log(`\n--- ${label} ---`);

  // Try both GET (persisted query) and POST (full query) approaches
  // We don't know the hash, so try POST with a dummy query first

  // Approach: POST with operationName + variables (no query body, hope server looks up by name)
  const body = JSON.stringify({ operationName, variables });

  try {
    const res = await fetch('https://www.instacart.com/graphql', {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Cookie': cookies,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body,
    });

    const text = await res.text();
    console.log(`  Status: ${res.status}, Size: ${text.length}`);

    try {
      const json = JSON.parse(text);
      if (json.errors) {
        console.log(`  Errors: ${JSON.stringify(json.errors).substring(0, 300)}`);
      }
      if (json.data) {
        console.log(`  Data keys: ${Object.keys(json.data)}`);
        console.log(`  Data: ${JSON.stringify(json.data).substring(0, 500)}`);
      }
    } catch {
      console.log(`  Raw: ${text.substring(0, 300)}`);
    }
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
}

// Try store lookup endpoints that might give us shopId for different zips
async function tryStoreApi(postalCode) {
  console.log(`\n=== Store API for ${postalCode} ===`);

  // Try the v3 store API
  const urls = [
    `https://www.instacart.com/v3/retailers?postal_code=${postalCode}`,
    `https://www.instacart.com/v3/containers/costco/next_gen/retailer_information?postal_code=${postalCode}`,
    `https://www.instacart.com/v3/dynamic_item_list/costco?postal_code=${postalCode}&source=web`,
  ];

  for (const url of urls) {
    const shortUrl = url.replace('https://www.instacart.com', '');
    console.log(`\n  GET ${shortUrl}`);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Cookie': cookies, 'Accept': 'application/json' },
      });
      const text = await res.text();
      console.log(`    Status: ${res.status}, Size: ${text.length}`);
      if (res.ok && text.length > 0) {
        try {
          const json = JSON.parse(text);
          // Look for shopId, zoneId, store info
          const str = JSON.stringify(json).substring(0, 500);
          if (str.includes('shopId') || str.includes('shop_id') || str.includes('zone')) {
            console.log(`    Contains shop/zone data!`);
          }
          console.log(`    Preview: ${str}`);
        } catch {
          console.log(`    Raw: ${text.substring(0, 300)}`);
        }
      }
    } catch (e) {
      console.log(`    Error: ${e.message}`);
    }
  }
}

// Try fetching storefront HTML for different postal codes via URL param
async function tryStorefrontWithZip(retailerSlug, postalCode) {
  console.log(`\n=== Storefront ${retailerSlug} @ ${postalCode} ===`);

  // Some sites support ?postal_code= or ?zipCode= params
  const urls = [
    `https://www.instacart.com/store/${retailerSlug}/storefront?postal_code=${postalCode}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Cookie': cookies, 'Accept': 'text/html' },
        redirect: 'manual',
      });
      console.log(`  Status: ${res.status}`);
      if (res.status >= 300 && res.status < 400) {
        console.log(`  Redirect: ${res.headers.get('location')}`);
      }
      if (res.ok) {
        const html = await res.text();
        // Extract shopId, zoneId, postalCode
        const shopId = html.match(/shopId["']\s*:\s*["']([^"']+)/)?.[1] || html.match(/shopId%22%3A%22([^%&"]+)/)?.[1];
        const zoneId = html.match(/zoneId["']\s*:\s*["']([^"']+)/)?.[1] || html.match(/zoneId%22%3A%22([^%&"]+)/)?.[1];
        const pc = html.match(/postalCode["']\s*:\s*["']([^"']+)/)?.[1] || html.match(/postalCode%22%3A%22([^%&"]+)/)?.[1];
        console.log(`  shopId: ${shopId}, zoneId: ${zoneId}, postalCode: ${pc}`);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

console.log('=== Instacart Store Lookup Test ===');

// Try REST APIs
await tryStoreApi('01906');  // NE (our current area)
await tryStoreApi('10001');  // NYC
await tryStoreApi('90210');  // LA

// Try storefront with zip override
await tryStorefrontWithZip('costco', '10001');
await tryStorefrontWithZip('costco', '90210');

console.log('\n=== Done ===');
