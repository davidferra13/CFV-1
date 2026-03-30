/**
 * Capture Instacart department browsing GraphQL hashes.
 * Navigates through departments on Market Basket to find the persisted query
 * hashes for collection/department product listing (not search).
 *
 * This is the key to going from 8% to 80%+ store coverage.
 */

import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== Instacart Department Hash Capture ===');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1366,768'],
  });

  const graphqlRequests = [];

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

  // Intercept ALL GraphQL requests
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/graphql')) {
      const method = req.method();
      const urlObj = new URL(url);
      const opName = urlObj.searchParams.get('operationName') || 'unknown';
      const extensions = urlObj.searchParams.get('extensions');
      const variables = urlObj.searchParams.get('variables');

      let hash = null;
      if (extensions) {
        try {
          const ext = JSON.parse(extensions);
          hash = ext.persistedQuery?.sha256Hash;
        } catch {}
      }

      // Also check POST body
      const postData = req.postData();
      if (postData && !hash) {
        try {
          const body = JSON.parse(postData);
          hash = body.extensions?.persistedQuery?.sha256Hash;
        } catch {}
      }

      graphqlRequests.push({
        method,
        operationName: opName,
        hash,
        variables: variables ? variables.substring(0, 500) : (postData ? postData.substring(0, 500) : null),
        url: url.substring(0, 200),
        timestamp: Date.now(),
      });
    }
  });

  // Step 1: Load store page (establishes session)
  console.log('\n[1] Loading Market Basket storefront...');
  try {
    await page.goto('https://www.instacart.com/store/market-basket/storefront', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  } catch {}
  await sleep(8000);

  console.log(`  GraphQL requests so far: ${graphqlRequests.length}`);
  const storefrontOps = [...new Set(graphqlRequests.map(r => r.operationName))];
  console.log(`  Operations: ${storefrontOps.join(', ')}`);

  // Step 2: Find department links
  console.log('\n[2] Looking for department/collection links...');
  const links = await page.evaluate(() => {
    const anchors = document.querySelectorAll('a[href*="/collections/"], a[href*="/departments/"], a[href*="/category/"]');
    return Array.from(anchors).map(a => ({
      href: a.href,
      text: a.textContent?.trim()?.substring(0, 50),
    })).filter(l => l.href && l.text);
  });

  console.log(`  Found ${links.length} department/collection links`);
  const uniqueLinks = [...new Map(links.map(l => [l.href, l])).values()];
  uniqueLinks.slice(0, 20).forEach(l => console.log(`    ${l.text} -> ${l.href}`));

  // Step 3: Click on first few departments to capture their GraphQL calls
  const departmentsToVisit = [
    '/store/market-basket/collections/produce',
    '/store/market-basket/collections/dairy',
    '/store/market-basket/collections/meat',
    '/store/market-basket/collections/frozen',
    '/store/market-basket/collections/snacks',
    '/store/market-basket/collections/beverages',
    '/store/market-basket/collections/bakery',
    '/store/market-basket/collections/deli',
    '/store/market-basket/collections/household',
    '/store/market-basket/collections/personal-care',
    '/store/market-basket/collections/baby',
    '/store/market-basket/collections/pet-care',
  ];

  // Also add any links we found on the page
  for (const link of uniqueLinks) {
    const path = new URL(link.href).pathname;
    if (!departmentsToVisit.includes(path)) {
      departmentsToVisit.push(path);
    }
  }

  console.log(`\n[3] Visiting ${Math.min(departmentsToVisit.length, 15)} departments...`);

  const beforeDeptCount = graphqlRequests.length;

  for (let i = 0; i < Math.min(departmentsToVisit.length, 15); i++) {
    const dept = departmentsToVisit[i];
    const fullUrl = dept.startsWith('http') ? dept : `https://www.instacart.com${dept}`;
    const label = dept.split('/').pop();

    console.log(`\n  [${i + 1}] Navigating to: ${label}`);
    const beforeCount = graphqlRequests.length;

    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch {}
    await sleep(5000);

    // Scroll down to trigger lazy loads
    await page.evaluate(() => window.scrollBy(0, 2000));
    await sleep(2000);

    const newRequests = graphqlRequests.slice(beforeCount);
    const newOps = [...new Set(newRequests.map(r => r.operationName))];
    console.log(`    New GraphQL ops (${newRequests.length}): ${newOps.join(', ')}`);

    // Log any new hashes we haven't seen
    for (const req of newRequests) {
      if (req.hash) {
        console.log(`    HASH: ${req.operationName} = ${req.hash} [${req.method}]`);
      }
    }
  }

  // Step 4: Also try "See all" or pagination within a department
  console.log('\n[4] Looking for "See all" or subcategory links...');
  const seeAllLinks = await page.evaluate(() => {
    const anchors = document.querySelectorAll('a');
    return Array.from(anchors)
      .filter(a => {
        const text = a.textContent?.trim()?.toLowerCase() || '';
        return text.includes('see all') || text.includes('view all') || text.includes('show more');
      })
      .map(a => ({ href: a.href, text: a.textContent?.trim()?.substring(0, 50) }))
      .slice(0, 10);
  });

  console.log(`  Found ${seeAllLinks.length} "see all" links`);
  for (const link of seeAllLinks.slice(0, 5)) {
    console.log(`    ${link.text} -> ${link.href}`);
    const beforeCount = graphqlRequests.length;
    try {
      await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch {}
    await sleep(5000);
    await page.evaluate(() => window.scrollBy(0, 3000));
    await sleep(2000);

    const newRequests = graphqlRequests.slice(beforeCount);
    for (const req of newRequests) {
      if (req.hash) {
        console.log(`    HASH: ${req.operationName} = ${req.hash} [${req.method}]`);
      }
    }
  }

  // Step 5: Compile all unique operation/hash pairs
  console.log('\n\n=== ALL CAPTURED HASHES ===');
  const hashMap = new Map();
  for (const req of graphqlRequests) {
    if (req.hash && !hashMap.has(req.hash)) {
      hashMap.set(req.hash, {
        operationName: req.operationName,
        hash: req.hash,
        method: req.method,
        sampleVariables: req.variables,
      });
    }
  }

  const allHashes = [...hashMap.values()];
  allHashes.forEach(h => {
    console.log(`\n${h.operationName} [${h.method}]`);
    console.log(`  Hash: ${h.hash}`);
    if (h.sampleVariables) {
      console.log(`  Variables: ${h.sampleVariables.substring(0, 300)}`);
    }
  });

  // Save full capture data
  const output = {
    timestamp: Date.now(),
    totalRequests: graphqlRequests.length,
    uniqueHashes: allHashes,
    allRequests: graphqlRequests,
  };

  writeFileSync(join(__dirname, 'department-hashes.json'), JSON.stringify(output, null, 2));
  console.log(`\nSaved ${allHashes.length} unique hashes to department-hashes.json`);
  console.log(`Total GraphQL requests captured: ${graphqlRequests.length}`);

  await browser.close();
  console.log('Browser closed');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
