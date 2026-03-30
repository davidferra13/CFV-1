/**
 * Find persisted query hashes in Instacart JS bundles
 */

const UA = 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function main() {
  // Get HTML to find bundle URLs
  const res = await fetch('https://www.instacart.com/store/market-basket/search/milk', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
  });
  const html = await res.text();

  const scriptUrls = [...html.matchAll(/src="(https:\/\/[^"]*\.js)"/g)].map(m => m[1]);
  console.log(`Found ${scriptUrls.length} JS bundles`);

  // Download bundles that had "persisted" or "SearchResult" and look for hashes
  const targetBundles = [
    // From earlier scan, these had persisted=true
    '98364', '23162', '79954',
    // These had SearchResult
    '28132', '8386', '75702', '72444',
    // Main store bundle
    'store.webpack',
    // Chunks with search
    '10045', '43632', '96832', '87440', '37585', '40114', '66256', '39074', '23064', '91492', '4909',
  ];

  for (const url of scriptUrls) {
    const filename = url.split('/').pop();
    const isTarget = targetBundles.some(t => filename.includes(t));
    if (!isTarget) continue;

    try {
      const jsRes = await fetch(url, { headers: { 'User-Agent': UA } });
      const js = await jsRes.text();

      // Look for SHA256 hashes (64 hex chars)
      const hashMatches = js.matchAll(/['"]([\da-f]{64})['"]/g);
      const hashes = [];
      for (const hm of hashMatches) hashes.push(hm[1]);

      // Look for persisted query references
      const persistedRefs = js.matchAll(/persistedQuery|sha256Hash|documentId/gi);
      const persisted = [...persistedRefs].length;

      // Look for operation name + hash pairs
      const opHashPairs = js.matchAll(/["'](\w+)["'][^;]{0,200}["']([\da-f]{64})["']/g);
      const pairs = [];
      for (const p of opHashPairs) pairs.push({ op: p[1], hash: p[2] });

      if (hashes.length > 0 || persisted > 0) {
        console.log(`\n${filename}: ${hashes.length} hashes, ${persisted} persisted refs`);
        if (pairs.length > 0) {
          console.log('  Operation-hash pairs:');
          pairs.forEach(p => console.log(`    ${p.op}: ${p.hash}`));
        }
        if (hashes.length > 0 && hashes.length <= 20) {
          console.log('  Hashes:', hashes.join(', ').substring(0, 200));
        }
      }

      // Also look for documentId format (newer Apollo Client)
      const docIdMatches = js.matchAll(/documentId['":\s]+"([^"]+)"/g);
      for (const dim of docIdMatches) {
        console.log(`  documentId: ${dim[1]}`);
      }

      // Look for "SearchResult" near hashes
      if (js.includes('SearchResult') && hashes.length > 0) {
        const searchIdx = js.indexOf('SearchResult');
        const nearby = js.substring(Math.max(0, searchIdx - 500), searchIdx + 500);
        const nearbyHashes = nearby.matchAll(/([\da-f]{64})/g);
        for (const nh of nearbyHashes) {
          console.log(`  Hash near SearchResult: ${nh[1]}`);
        }
      }

    } catch (e) {
      console.log(`Error fetching ${filename}: ${e.message}`);
    }
  }

  // Also check inline scripts for query configurations
  console.log('\n\n=== Checking inline scripts for query config ===');
  const inlineScripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  for (let i = 0; i < inlineScripts.length; i++) {
    const content = inlineScripts[i][1];
    if (content.includes('operationName') && content.length > 1000) {
      // Decode if URL-encoded
      let decoded = content;
      if (content.includes('%22')) {
        try { decoded = decodeURIComponent(content); } catch {}
      }

      // Find operation name + query pairs
      const ops = decoded.matchAll(/"operationName"\s*:\s*"([^"]+)"/g);
      const opNames = [...ops].map(o => o[1]);
      if (opNames.length > 0) {
        console.log(`\nInline script ${i} (${content.length} chars): ${opNames.length} operations`);
        opNames.forEach(name => console.log(`  ${name}`));

        // Check if any has a query hash nearby
        for (const opName of opNames) {
          const opIdx = decoded.indexOf(opName);
          const nearby = decoded.substring(opIdx, Math.min(decoded.length, opIdx + 500));
          const hashMatch = nearby.match(/([\da-f]{64})/);
          if (hashMatch) {
            console.log(`    Hash for ${opName}: ${hashMatch[1]}`);
          }
          // Also check for "extensions"
          if (nearby.includes('extensions') || nearby.includes('persistedQuery')) {
            console.log(`    Has extensions/persistedQuery near ${opName}`);
          }
        }
      }
    }
  }
}

main().catch(e => console.error('Error:', e.message));
