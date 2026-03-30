/**
 * Deep analysis of Instacart produce page content structure
 */

import { readFileSync } from 'fs';

const UA = 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function main() {
  let cookies = '';
  try {
    const session = JSON.parse(readFileSync('/home/davidferra/openclaw-prices/data/instacart-session.json', 'utf8'));
    cookies = session.cookies;
  } catch {}

  const url = 'https://www.instacart.com/store/market-basket/collections/produce';
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Cookie': cookies },
  });
  const html = await res.text();

  // Find the $3.99 and show context
  let idx = html.indexOf('$3.99');
  if (idx > -1) {
    console.log('=== Context around $3.99 ===');
    console.log(html.substring(Math.max(0, idx - 500), idx + 500));
  }

  // Check for URL-encoded JSON blobs (common in Next.js RSC)
  const encodedBlobs = html.matchAll(/%7B[^<]{100,}%7D/g);
  let blobCount = 0;
  for (const blob of encodedBlobs) {
    blobCount++;
    try {
      const decoded = decodeURIComponent(blob[0]);
      if (decoded.includes('price') || decoded.includes('product') || decoded.includes('item')) {
        console.log(`\n=== Encoded blob ${blobCount} (decoded ${decoded.length} chars) ===`);
        // Find product-like structures
        const productMatches = decoded.matchAll(/"name"\s*:\s*"([^"]{3,60})"/g);
        const names = [];
        for (const pm of productMatches) names.push(pm[1]);
        if (names.length > 0) {
          console.log(`Product names found: ${names.length}`);
          console.log('Samples:', names.slice(0, 10).join(', '));
        }
        // Find prices
        const priceMatches = decoded.matchAll(/"price"\s*:\s*"?(\$?[\d.]+)"?/g);
        const prices = [];
        for (const pm of priceMatches) prices.push(pm[1]);
        if (prices.length > 0) {
          console.log(`Prices found: ${prices.length}`);
          console.log('Samples:', prices.slice(0, 10).join(', '));
        }
      }
    } catch {}
    if (blobCount > 20) break;
  }

  // Try a completely different approach: Instacart's internal API
  console.log('\n\n=== Testing Instacart internal API endpoints ===');

  // Try the GraphQL endpoint with a proper query we'll construct
  // Based on the bundle analysis, the operation is SearchCollectionProductsBasedSearchResults
  const gqlBodies = [
    // Try with the collection/department query
    {
      operationName: 'SearchCollectionProductsBasedSearchResults',
      variables: {
        filters: [],
        slug: 'produce',
        storeSlug: 'market-basket',
        first: 30,
      },
      query: 'query SearchCollectionProductsBasedSearchResults($slug: String!, $storeSlug: String!, $first: Int, $filters: [SearchFilter!]) { searchCollectionProductsBasedSearchResults(slug: $slug, storeSlug: $storeSlug, first: $first, filters: $filters) { items { id name price { amount } } } }',
    },
    // Try with a simpler format
    {
      operationName: 'SearchResultsPlacements',
      variables: {
        query: 'milk',
        storeSlug: 'market-basket',
        first: 30,
      },
      query: 'query SearchResultsPlacements($query: String!, $storeSlug: String!, $first: Int) { searchResultsPlacements(query: $query, storeSlug: $storeSlug, first: $first) { placements { items { id name price { amount } } } } }',
    },
  ];

  for (const body of gqlBodies) {
    console.log(`\nTrying: ${body.operationName}`);
    try {
      const gqlRes = await fetch('https://www.instacart.com/graphql', {
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cookie': cookies,
          'Origin': 'https://www.instacart.com',
        },
        body: JSON.stringify(body),
      });
      console.log(`Status: ${gqlRes.status}`);
      const text = await gqlRes.text();
      console.log(`Response (${text.length} chars): ${text.substring(0, 300)}`);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }

  // Try the newer API format with batch requests
  console.log('\n=== Testing batch GraphQL ===');
  const batchBody = [
    {
      operationName: 'SearchResultsPlacements',
      variables: { query: 'milk', storeSlug: 'market-basket', first: 10 },
      query: 'query SearchResultsPlacements($query: String!, $storeSlug: String!, $first: Int) { searchResultsPlacements(query: $query, storeSlug: $storeSlug, first: $first) { placements { items { id name } } } }',
    },
  ];
  try {
    const batchRes = await fetch('https://www.instacart.com/graphql', {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'Origin': 'https://www.instacart.com',
      },
      body: JSON.stringify(batchBody),
    });
    console.log(`Batch status: ${batchRes.status}`);
    const batchText = await batchRes.text();
    console.log(`Batch response: ${batchText.substring(0, 300)}`);
  } catch (e) {
    console.log(`Batch error: ${e.message}`);
  }
}

main().catch(e => console.error('Error:', e.message));
