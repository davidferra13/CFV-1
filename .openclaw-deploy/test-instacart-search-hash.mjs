/**
 * Find the SearchResultsPlacements persisted query hash in Instacart bundles
 * Focus on the bundle that contains the search query definition
 */

import { readFileSync } from 'fs';

const UA = 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function main() {
  let cookies = '';
  try {
    const session = JSON.parse(readFileSync('/home/davidferra/openclaw-prices/data/instacart-session.json', 'utf8'));
    cookies = session.cookies;
  } catch {}

  // Get HTML
  const res = await fetch('https://www.instacart.com/store/market-basket/search/milk', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Cookie': cookies },
  });
  const html = await res.text();
  const scriptUrls = [...html.matchAll(/src="(https:\/\/[^"]*\.js)"/g)].map(m => m[1]);

  // The search query must be in the search-related chunks
  // Download ALL bundles that mention SearchResult and look for hashes nearby
  console.log(`Searching ${scriptUrls.length} bundles for search-related hashes...`);

  for (const url of scriptUrls) {
    const filename = url.split('/').pop();
    try {
      const jsRes = await fetch(url, { headers: { 'User-Agent': UA } });
      const js = await jsRes.text();

      // Skip small files
      if (js.length < 1000) continue;

      // Look for SearchResultsPlacements or similar search operations
      const searchOps = [
        'SearchResultsPlacements',
        'SearchCollectionProducts',
        'SubjectProductsBased',
        'ViewLayoutSearchResults',
        'ShopCollectionScoped',
        'BrowsePlacements',
      ];

      for (const opName of searchOps) {
        if (!js.includes(opName)) continue;

        // Find all 64-char hex strings within 2000 chars of the operation name
        const opIdx = js.indexOf(opName);
        const searchRadius = 5000;
        const region = js.substring(
          Math.max(0, opIdx - searchRadius),
          Math.min(js.length, opIdx + searchRadius)
        );

        const hashes = [...region.matchAll(/["'](22[\da-f]{62})["']/g)];
        if (hashes.length > 0) {
          console.log(`\n${filename}: ${opName} found with ${hashes.length} nearby hashes`);
          hashes.forEach(h => console.log(`  ${h[1]}`));
        }

        // Also look for the operation in AST format with a hash reference
        // Pattern: {kind:"Document",definitions:[{...name:{kind:"Name",value:"SearchResultsPlacements"}...}]}
        // The hash is usually in a nearby variable or object
        const surroundingCode = js.substring(
          Math.max(0, opIdx - 200),
          Math.min(js.length, opIdx + 200)
        );

        // Check for documentId or id field
        const idMatch = surroundingCode.match(/(?:documentId|id)\s*[=:]\s*["']([^"']+)["']/);
        if (idMatch) {
          console.log(`  ID for ${opName}: ${idMatch[1]}`);
        }
      }
    } catch {}
  }

  // Now test with known hashes
  // ShopCollectionScoped should give us department/collection products
  console.log('\n\n=== Testing persisted queries ===');

  const testQueries = [
    {
      name: 'ShopCollectionScoped',
      hash: '22c6a0fcb3d1a4a14e5800cc6c38e736e85177f80f0c01a5535646f83238e65b',
      variables: {
        slug: 'produce',
        retailerSlug: 'market-basket',
      },
    },
    {
      name: 'DepartmentNavCollections',
      hash: '22e5231eab24795280ff3e556c24ddfedaed6d9d553a856fa20670428087a21e',
      variables: {
        retailerSlug: 'market-basket',
      },
    },
    {
      name: 'RetailersUxStorefront',
      hash: '220704167e57b0c492a4c2f1f8e13197a38983a2dac373e3dd062c3f7361880a',
      variables: {
        retailerSlug: 'market-basket',
      },
    },
  ];

  for (const q of testQueries) {
    console.log(`\nTesting: ${q.name}`);
    const body = JSON.stringify({
      operationName: q.name,
      variables: q.variables,
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: q.hash,
        },
      },
    });

    try {
      const gqlRes = await fetch('https://www.instacart.com/graphql', {
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cookie': cookies,
          'Origin': 'https://www.instacart.com',
          'Referer': 'https://www.instacart.com/store/market-basket/collections/produce',
        },
        body,
      });
      console.log(`Status: ${gqlRes.status}`);
      const text = await gqlRes.text();
      const hasData = text.includes('"data":{') || text.includes('"data":null');
      const hasErrors = text.includes('"errors"');
      console.log(`Length: ${text.length}, hasData: ${hasData}, hasErrors: ${hasErrors}`);
      if (text.length < 500) {
        console.log(`Response: ${text}`);
      } else {
        console.log(`Response preview: ${text.substring(0, 300)}`);
        // Count product-like items
        const nameCount = (text.match(/"name"/g) || []).length;
        const priceCount = (text.match(/"price"/g) || []).length;
        console.log(`Names: ${nameCount}, Prices: ${priceCount}`);
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

main().catch(e => console.error('Error:', e.message));
