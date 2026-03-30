/**
 * Test script: Capture Instacart GraphQL query template
 * Fetches JS bundles to find the SearchResultsPlacements query string
 */

const SEARCH_URL = 'https://www.instacart.com/store/market-basket/search/milk';
const UA = 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function main() {
  // Step 1: Get the search page HTML
  console.log('Fetching search page...');
  const res = await fetch(SEARCH_URL, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
  });
  const html = await res.text();
  console.log('HTML length:', html.length);

  // Step 2: Find JS bundle URLs
  const scriptUrls = [];
  const scriptMatches = html.matchAll(/src="(https:\/\/[^"]*\.js)"/g);
  for (const m of scriptMatches) scriptUrls.push(m[1]);
  console.log('JS bundles found:', scriptUrls.length);

  // Step 3: Download each bundle and search for SearchResultsPlacements
  for (const url of scriptUrls) {
    const filename = url.split('/').pop();
    try {
      const jsRes = await fetch(url, {
        headers: { 'User-Agent': UA },
      });
      const js = await jsRes.text();

      if (js.includes('SearchResultsPlacements') || js.includes('searchResultsPlacements')) {
        console.log(`\nFOUND in ${filename} (${js.length} bytes)`);

        // Extract the query string
        // Common patterns: query: "...", query: `...`
        const patterns = [
          /query\s*:\s*"(query\s+SearchResultsPlacements[^"]+)"/,
          /query\s*:\s*`(query\s+SearchResultsPlacements[^`]+)`/,
          /(query\s+SearchResultsPlacements\s*\([^)]+\)\s*\{[^}]+\})/,
        ];

        for (const pat of patterns) {
          const match = js.match(pat);
          if (match) {
            console.log('Query template found:');
            console.log(match[1].substring(0, 500));
            return;
          }
        }

        // If no pattern matched, show context around the mention
        const idx = js.indexOf('SearchResultsPlacements');
        console.log('Context (500 chars around mention):');
        console.log(js.substring(Math.max(0, idx - 200), idx + 300));
      }
    } catch (e) {
      // skip failed fetches
    }
  }

  console.log('\nSearchResultsPlacements not found in any bundle');
  console.log('Trying alternative: look for any graphql query patterns...');

  // Also check inline scripts
  const inlineScripts = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g);
  for (const m of inlineScripts) {
    if (m[1].includes('graphql') || m[1].includes('query ')) {
      console.log('Inline script with graphql reference, length:', m[1].length);
    }
  }
}

main().catch(e => console.error('Error:', e.message));
