/**
 * Extract product data from Instacart's React Server Components (RSC) stream
 * Next.js RSC uses self.__next_f.push() with serialized data
 */

import { readFileSync } from 'fs';

const UA = 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function main() {
  // Load existing session for cookies
  let cookies = '';
  try {
    const session = JSON.parse(readFileSync('/home/davidferra/openclaw-prices/data/instacart-session.json', 'utf8'));
    cookies = session.cookies;
  } catch {}

  // Fetch with RSC headers to get server component data
  const urls = [
    'https://www.instacart.com/store/market-basket/search/milk',
    'https://www.instacart.com/store/market-basket/collections/produce',
  ];

  for (const url of urls) {
    console.log(`\n=== ${url.split('/').slice(-2).join('/')} ===`);

    // Try 1: Normal HTML request
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html',
        'Cookie': cookies,
      },
    });
    const html = await res.text();

    // Extract all self.__next_f.push() payloads
    const pushPayloads = [];
    const pushRegex = /self\.__next_f\.push\(\[(\d+),"((?:[^"\\]|\\.)*)"\]\)/g;
    let match;
    while ((match = pushRegex.exec(html)) !== null) {
      // Unescape the string
      let payload = match[2]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      pushPayloads.push({ type: match[1], payload });
    }

    console.log(`RSC payloads: ${pushPayloads.length}`);

    // Look for product-like data in payloads
    let productCount = 0;
    const products = [];

    for (const { type, payload } of pushPayloads) {
      // Look for price patterns ($X.XX)
      const prices = payload.match(/\$\d+\.\d{2}/g);
      if (prices && prices.length > 2) {
        console.log(`\nPayload type=${type}, length=${payload.length}, prices found: ${prices.length}`);
        console.log(`  Sample prices: ${prices.slice(0, 5).join(', ')}`);

        // Try to extract product names near prices
        // Look for patterns like "name":"ProductName" near prices
        const nameNearPrice = payload.matchAll(/([A-Z][a-zA-Z\s&',.-]{3,50})\s*[\$]\d+\.\d{2}/g);
        for (const npm of nameNearPrice) {
          products.push({ name: npm[1].trim(), price: npm[0].match(/\$\d+\.\d{2}/)[0] });
          if (products.length > 10) break;
        }
      }

      // Look for JSON objects in the payload
      const jsonObjects = payload.matchAll(/\{[^{}]{10,500}\}/g);
      for (const jo of jsonObjects) {
        try {
          const obj = JSON.parse(jo[0]);
          if (obj.name && (obj.price || obj.currentPrice || obj.viewSection)) {
            products.push({ name: obj.name, price: obj.price || obj.currentPrice });
            productCount++;
          }
        } catch {}
      }
    }

    // Also search the raw HTML for specific patterns
    // Instacart Next.js RSC uses a specific format for product cards
    const htmlProducts = html.matchAll(/"viewSection":\{[^}]*"title":"([^"]+)"[^}]*\}/g);
    for (const hp of htmlProducts) {
      products.push({ name: hp[1], source: 'viewSection' });
    }

    // Search for tracking data (often has product info)
    const trackingData = html.matchAll(/"tracking":\{[^}]*"product_name":"([^"]+)"[^}]*"price":"?(\$?[\d.]+)"?/g);
    for (const td of trackingData) {
      products.push({ name: td[1], price: td[2] });
    }

    console.log(`\nTotal products found: ${products.length}`);
    if (products.length > 0) {
      console.log('Samples:');
      products.slice(0, 15).forEach(p => console.log(`  ${p.name} - ${p.price || 'no price'}`));
    }

    // Check what the raw HTML contains around "searchResults"
    const searchIdx = html.indexOf('searchResults');
    if (searchIdx > -1) {
      console.log('\n"searchResults" context:');
      console.log(html.substring(searchIdx - 50, searchIdx + 200).replace(/\n/g, ' '));
    }

    // Try 2: RSC request (Next.js flight format)
    console.log('\n--- Trying RSC flight request ---');
    const rscRes = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/x-component',
        'Cookie': cookies,
        'RSC': '1',
        'Next-Router-State-Tree': '%5B%22%22%5D',
        'Next-Url': url.replace('https://www.instacart.com', ''),
      },
    });
    console.log(`RSC status: ${rscRes.status}`);
    const rscText = await rscRes.text();
    console.log(`RSC length: ${rscText.length}`);
    if (rscText.length > 0 && rscText.length < 1000) {
      console.log(`RSC content: ${rscText.substring(0, 500)}`);
    } else if (rscText.length > 1000) {
      // Check for product data
      const rscPrices = rscText.match(/\$\d+\.\d{2}/g);
      console.log(`RSC prices found: ${rscPrices ? rscPrices.length : 0}`);
      if (rscPrices) console.log(`  Sample: ${rscPrices.slice(0, 5).join(', ')}`);
    }
  }
}

main().catch(e => console.error('Error:', e.message));
