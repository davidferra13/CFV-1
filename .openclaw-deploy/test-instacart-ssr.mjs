/**
 * Test: Extract product data from Instacart SSR (Server-Side Rendered) data
 * The search page embeds query results in inline scripts
 */

const UA = 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function fetchAndExtract(url, label) {
  console.log(`\n=== ${label} ===`);
  console.log(`Fetching: ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
  });
  const html = await res.text();
  console.log(`HTML: ${html.length} bytes, Status: ${res.status}`);

  // Find all inline scripts
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  console.log(`Inline scripts: ${scripts.length}`);

  const products = [];
  const seen = new Set();

  for (let i = 0; i < scripts.length; i++) {
    let content = scripts[i][1].trim();
    if (content.length < 100) continue;

    // Try to decode URL-encoded JSON
    if (content.includes('%22') || content.includes('%7B')) {
      try {
        // Find the JSON-like portion
        const jsonMatch = content.match(/(?:self\.__next_f\.push\(\[1,"|=)\s*(%7B[\s\S]+)/);
        if (jsonMatch) {
          const decoded = decodeURIComponent(jsonMatch[1].replace(/"\]\)$/,''));
          if (decoded.length > 1000) {
            // Walk the decoded data for products
            try {
              const data = JSON.parse(decoded);
              walkForProducts(data, products, seen);
            } catch {}
          }
        }
      } catch {}
    }

    // Try direct JSON parsing
    if (content.startsWith('{') || content.startsWith('[')) {
      try {
        const data = JSON.parse(content);
        walkForProducts(data, products, seen);
      } catch {}
    }

    // Try __NEXT_DATA__
    if (content.includes('__NEXT_DATA__')) {
      const match = content.match(/__NEXT_DATA__\s*=\s*({[\s\S]+})/);
      if (match) {
        try {
          walkForProducts(JSON.parse(match[1]), products, seen);
        } catch {}
      }
    }

    // Try self.__next_f.push format (Next.js RSC)
    const pushMatches = content.matchAll(/self\.__next_f\.push\(\[1,"([^"]+)"\]\)/g);
    for (const pm of pushMatches) {
      try {
        const decoded = pm[1]
          .replace(/\\u0022/g, '"')
          .replace(/\\u005c/g, '\\')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t');
        // Find JSON objects in the decoded string
        const jsonMatches = decoded.matchAll(/\{[^{}]*"name"[^{}]*"price"[^{}]*\}/g);
        for (const jm of jsonMatches) {
          try {
            const obj = JSON.parse(jm[0]);
            if (obj.name && obj.price) {
              const key = obj.name.toLowerCase();
              if (!seen.has(key)) {
                seen.add(key);
                products.push({ name: obj.name, price: obj.price });
              }
            }
          } catch {}
        }
      } catch {}
    }

    // Search for price patterns in raw content
    if (content.length > 10000 && (content.includes('price') || content.includes('\\u0024'))) {
      // Try to find product-like structures
      const pricePatterns = content.matchAll(/"name"\s*:\s*"([^"]+)"[^}]*"price"\s*:\s*"?(\$?[\d.]+)"?/g);
      for (const pp of pricePatterns) {
        const key = pp[1].toLowerCase();
        if (!seen.has(key) && pp[1].length > 2) {
          seen.add(key);
          products.push({ name: pp[1], price: pp[2] });
        }
      }
    }
  }

  console.log(`Products extracted: ${products.length}`);
  if (products.length > 0) {
    console.log('Sample products:');
    products.slice(0, 10).forEach(p => console.log(`  ${p.name} - ${p.price}`));
  }

  return products;
}

function walkForProducts(obj, products, seen, depth = 0) {
  if (depth > 20 || !obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (const item of obj) walkForProducts(item, products, seen, depth + 1);
    return;
  }

  const name = obj.name || obj.productName || obj.title || obj.product_name;
  const price = obj.price || obj.currentPrice || obj.viewSection?.itemImage?.price || obj.store_price;

  if (name && typeof name === 'string' && name.length > 2 && price) {
    const key = name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      products.push({ name: name.trim(), price: String(price) });
    }
  }

  for (const key of Object.keys(obj)) {
    walkForProducts(obj[key], products, seen, depth + 1);
  }
}

async function main() {
  // Test 1: Search page
  await fetchAndExtract(
    'https://www.instacart.com/store/market-basket/search/milk',
    'Search: milk'
  );

  // Test 2: Category/collection page
  await fetchAndExtract(
    'https://www.instacart.com/store/market-basket/collections/produce',
    'Collection: produce'
  );

  // Test 3: Search for chicken
  await fetchAndExtract(
    'https://www.instacart.com/store/market-basket/search/chicken',
    'Search: chicken'
  );
}

main().catch(e => console.error('Error:', e.message));
