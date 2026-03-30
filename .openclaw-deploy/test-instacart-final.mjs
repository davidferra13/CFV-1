/**
 * Final test: Try Instacart GraphQL with proper session cookies and various query formats
 */

import { readFileSync } from 'fs';
import crypto from 'crypto';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function main() {
  const session = JSON.parse(readFileSync('/home/davidferra/openclaw-prices/data/instacart-session.json', 'utf8'));
  const cookies = session.cookies;
  console.log('Session age (hours):', ((Date.now() - session.timestamp) / 3600000).toFixed(1));

  // Base headers
  const baseHeaders = {
    'User-Agent': session.ua || UA,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Cookie': cookies,
    'Origin': 'https://www.instacart.com',
    'Referer': 'https://www.instacart.com/store/market-basket/search/milk',
  };

  // Test 1: Minimal query string (not persisted query format)
  console.log('=== Test 1: Full query string ===');
  await testGQL(baseHeaders, {
    operationName: 'SearchResultsPlacements',
    variables: {
      query: 'milk',
      storeSlug: 'market-basket',
      first: 10,
    },
    query: 'query SearchResultsPlacements($query: String!, $storeSlug: String!, $first: Int) { searchResultsPlacements(query: $query, storeSlug: $storeSlug, first: $first) { placements { items { id name } } } }',
  });

  // Test 2: Without extensions field
  console.log('\n=== Test 2: Without operationName ===');
  await testGQL(baseHeaders, {
    query: '{ searchResultsPlacements(query: "milk", storeSlug: "market-basket", first: 10) { placements { items { id name } } } }',
  });

  // Test 3: Try the internal API endpoint
  console.log('\n=== Test 3: Internal API endpoint ===');
  try {
    const res = await fetch('https://internal-api.icprivate.com/graphql', {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        operationName: 'SearchResultsPlacements',
        variables: { query: 'milk', storeSlug: 'market-basket', first: 10 },
        query: 'query SearchResultsPlacements($query: String!, $storeSlug: String!, $first: Int) { searchResultsPlacements(query: $query, storeSlug: $storeSlug, first: $first) { placements { items { id name } } } }',
      }),
    });
    console.log(`Status: ${res.status}, Body: ${(await res.text()).substring(0, 300)}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }

  // Test 4: Try different content types
  console.log('\n=== Test 4: form-urlencoded ===');
  try {
    const res = await fetch('https://www.instacart.com/graphql', {
      method: 'POST',
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        operationName: 'SearchResultsPlacements',
        variables: JSON.stringify({ query: 'milk', storeSlug: 'market-basket', first: 10 }),
        query: 'query SearchResultsPlacements($query: String!, $storeSlug: String!, $first: Int) { searchResultsPlacements(query: $query, storeSlug: $storeSlug, first: $first) { placements { items { id name } } } }',
      }),
    });
    console.log(`Status: ${res.status}, Body: ${(await res.text()).substring(0, 300)}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }

  // Test 5: Try Instacart's known API paths
  console.log('\n=== Test 5: REST API paths ===');
  const apiPaths = [
    '/v3/retailers/market-basket/products?query=milk&per=30',
    '/api/v3/retailers/market-basket/products?query=milk',
    '/api/v2/search?query=milk&retailer_slug=market-basket',
    '/v3/containers/market-basket/next_gen/retailer_search/milk',
    '/api/v3/containers/market-basket/next_gen/retailer_search/milk',
  ];

  for (const path of apiPaths) {
    try {
      const res = await fetch(`https://www.instacart.com${path}`, {
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json',
          'Cookie': cookies,
        },
      });
      const status = res.status;
      const body = await res.text();
      const isJson = body.startsWith('{') || body.startsWith('[');
      console.log(`${path} -> ${status} ${isJson ? 'JSON' : 'HTML'} (${body.length})`);
      if (isJson && status === 200) {
        console.log(`  Preview: ${body.substring(0, 200)}`);
      }
    } catch (e) {
      console.log(`${path} -> Error: ${e.message}`);
    }
  }

  // Test 6: Try the SSR fetch API (what the server uses to hydrate)
  console.log('\n=== Test 6: RSC prefetch ===');
  try {
    const res = await fetch('https://www.instacart.com/store/market-basket/search/milk?_rsc=1', {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/x-component',
        'Cookie': cookies,
        'RSC': '1',
        'Next-Router-Prefetch': '1',
      },
    });
    const text = await res.text();
    console.log(`Status: ${res.status}, Length: ${text.length}`);
    // Check for product data
    const priceCount = (text.match(/\$\d+\.\d{2}/g) || []).length;
    const nameCount = (text.match(/"name"/g) || []).length;
    console.log(`Prices: ${priceCount}, Names: ${nameCount}`);
    if (priceCount > 0) {
      console.log('Preview:', text.substring(0, 500));
    }
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }

  // Test 7: Check Instacart's sitemap for API clues
  console.log('\n=== Test 7: Mobile/API endpoints ===');
  const mobileEndpoints = [
    '/graphql_gateway',
    '/api/graphql',
    '/v3/graphql',
  ];
  for (const endpoint of mobileEndpoints) {
    try {
      const res = await fetch(`https://www.instacart.com${endpoint}`, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          operationName: 'SearchResultsPlacements',
          variables: { query: 'milk', storeSlug: 'market-basket', first: 10 },
          query: 'query SearchResultsPlacements($query: String!, $storeSlug: String!, $first: Int) { searchResultsPlacements(query: $query, storeSlug: $storeSlug, first: $first) { placements { items { id name } } } }',
        }),
      });
      console.log(`${endpoint} -> ${res.status} (${(await res.text()).substring(0, 200)})`);
    } catch (e) {
      console.log(`${endpoint} -> Error: ${e.message}`);
    }
  }
}

async function testGQL(headers, body) {
  try {
    const res = await fetch('https://www.instacart.com/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response (${text.length}): ${text.substring(0, 300)}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}

main().catch(e => console.error('Error:', e.message));
