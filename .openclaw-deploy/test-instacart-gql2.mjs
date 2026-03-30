/**
 * Test script: Deep search for Instacart GraphQL query strings
 */

const SEARCH_URL = 'https://www.instacart.com/store/market-basket/search/milk';
const UA = 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function main() {
  console.log('Fetching search page...');
  const res = await fetch(SEARCH_URL, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
  });
  const html = await res.text();

  // Check inline scripts for query definitions
  const inlineScripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  console.log('Inline scripts:', inlineScripts.length);

  for (let i = 0; i < inlineScripts.length; i++) {
    const content = inlineScripts[i][1];
    if (content.includes('graphql') || content.includes('query ') || content.includes('SearchResult')) {
      console.log(`\n--- Inline script ${i} (${content.length} chars) ---`);
      // Show relevant portions
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('query') || line.includes('SearchResult') || line.includes('graphql')) {
          console.log(line.substring(0, 200));
        }
      }
    }
  }

  // Get JS bundle URLs
  const scriptUrls = [...html.matchAll(/src="(https:\/\/[^"]*\.js)"/g)].map(m => m[1]);

  // Search ALL bundles for query-like patterns
  console.log(`\nSearching ${scriptUrls.length} JS bundles for GQL query patterns...`);

  for (const url of scriptUrls) {
    const filename = url.split('/').pop();
    try {
      const jsRes = await fetch(url, { headers: { 'User-Agent': UA } });
      const js = await jsRes.text();

      // Look for: "query SearchResultsPlacements" or "query searchResultsPlacements"
      // Also: persisted query hashes, mutation definitions
      const hasSearch = js.includes('SearchResult');
      const hasQueryDef = js.match(/query\s+\w+\s*\(/);
      const hasPersisted = js.includes('persistedQuery') || js.includes('sha256Hash');

      if (hasSearch || hasQueryDef || hasPersisted) {
        console.log(`\n${filename}: search=${hasSearch} queryDef=${!!hasQueryDef} persisted=${hasPersisted}`);

        if (hasSearch) {
          // Find all occurrences
          let idx = 0;
          while ((idx = js.indexOf('SearchResult', idx)) !== -1) {
            const context = js.substring(Math.max(0, idx - 100), Math.min(js.length, idx + 200));
            // Only show if it looks like a query definition
            if (context.includes('query') || context.includes('operationName') || context.includes('variables')) {
              console.log('  CONTEXT:', context.substring(0, 300).replace(/\n/g, ' '));
            }
            idx += 12;
          }
        }

        if (hasPersisted) {
          const hashMatch = js.match(/sha256Hash['":\s]+"([a-f0-9]{64})"/);
          if (hashMatch) {
            console.log('  SHA256 hash:', hashMatch[1]);
          }
        }
      }
    } catch {}
  }

  // Try: Automatic Persisted Queries (APQ) format
  console.log('\n\n--- Testing APQ (Automatic Persisted Queries) format ---');
  const initRes = await fetch('https://www.instacart.com/', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
  });
  const setCookies = initRes.headers.getSetCookie ? initRes.headers.getSetCookie() : [];
  const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');

  // Try with extensions.persistedQuery
  const apqBody = JSON.stringify({
    operationName: 'SearchResultsPlacements',
    variables: {
      query: 'milk',
      first: 30,
      storeSlug: 'market-basket',
    },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: '', // We don't know this yet
      },
    },
  });

  const gqlRes = await fetch('https://www.instacart.com/graphql', {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cookie': cookieStr,
      'Origin': 'https://www.instacart.com',
    },
    body: apqBody,
  });
  console.log('APQ response status:', gqlRes.status);
  const apqText = await gqlRes.text();
  console.log('APQ response:', apqText.substring(0, 500));

  // Try v3 API endpoint
  console.log('\n\n--- Testing v3 API ---');
  const v3Res = await fetch('https://www.instacart.com/v3/containers/market-basket/next_gen/retailer_collections/produce?source=web&sort=best_match', {
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json',
      'Cookie': cookieStr,
    },
  });
  console.log('V3 API status:', v3Res.status);
  const v3Text = await v3Res.text();
  console.log('V3 response:', v3Text.substring(0, 500));
}

main().catch(e => console.error('Error:', e.message));
