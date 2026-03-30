/**
 * Test: Replay Instacart GraphQL on Pi using GET + persisted queries
 * This proves the Pi can fetch products without Puppeteer
 */

import { readFileSync } from 'fs';
import crypto from 'crypto';

const SESSION_PATH = '/home/davidferra/openclaw-prices/data/instacart-session.json';
const SEARCH_HASH = '95c5336c23ebbb52b5d5c63c28b0bb8ef1ae5adc191c334883b357a94701ff59';
const ITEMS_HASH = '5116339819ff07f207fd38f949a8a7f58e52cc62223b535405b087e3076ebf2f';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function main() {
  // Load session (use the freshly captured one if available, else the old one)
  let cookies, sessionToken;
  try {
    // First try the captured session from PC
    const session = JSON.parse(readFileSync('/home/davidferra/openclaw-prices/data/captured-session.json', 'utf8'));
    cookies = session.cookies;
    console.log('Using PC-captured session');
  } catch {
    const session = JSON.parse(readFileSync(SESSION_PATH, 'utf8'));
    cookies = session.cookies;
    console.log('Using existing Pi session');
  }

  // We need the retailerInventorySessionToken - try to get it from a page load first
  console.log('\n=== Getting session token ===');
  const storeRes = await fetch('https://www.instacart.com/store/market-basket/storefront', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Cookie': cookies },
  });
  const storeHtml = await storeRes.text();

  // Extract retailerInventorySessionToken from HTML
  const tokenMatch = storeHtml.match(/retailerInventorySessionToken['":\s]+"([^"]+)"/);
  if (tokenMatch) {
    sessionToken = tokenMatch[1];
    console.log('Found session token:', sessionToken);
  } else {
    // Try URL-encoded version
    const encodedMatch = storeHtml.match(/retailerInventorySessionToken%22%3A%22([^%]+)/);
    if (encodedMatch) {
      sessionToken = decodeURIComponent(encodedMatch[1]);
      console.log('Found encoded session token:', sessionToken);
    } else {
      console.log('No session token found, using default');
      sessionToken = 'v1.d2714be.19699452840502044-01906-04246x17101-1-13-147330-0-0';
    }
  }

  // Also extract shopId, zoneId from HTML
  const shopIdMatch = storeHtml.match(/shopId['":\s]+"?(\d+)"?/) || storeHtml.match(/shop_id['":\s]+"?(\d+)"?/);
  const zoneIdMatch = storeHtml.match(/zoneId['":\s]+"?(\d+)"?/) || storeHtml.match(/zone_id['":\s]+"?(\d+)"?/);
  const shopId = shopIdMatch ? shopIdMatch[1] : '137503';
  const zoneId = zoneIdMatch ? zoneIdMatch[1] : '143';
  console.log('shopId:', shopId, 'zoneId:', zoneId);

  // Update cookies from response
  const newCookies = storeRes.headers.getSetCookie ? storeRes.headers.getSetCookie() : [];
  if (newCookies.length > 0) {
    const newCookieStr = newCookies.map(c => c.split(';')[0]).join('; ');
    cookies = cookies + '; ' + newCookieStr;
    console.log('Updated cookies with', newCookies.length, 'new');
  }

  // Test search query via GET
  console.log('\n=== Testing Search (milk, first=30) ===');
  const variables = {
    filters: [],
    action: null,
    query: 'milk',
    pageViewId: crypto.randomUUID(),
    retailerInventorySessionToken: sessionToken,
    elevatedProductId: null,
    searchSource: 'search',
    disableReformulation: false,
    disableLlm: false,
    forceInspiration: false,
    orderBy: 'bestMatch',
    clusterId: null,
    includeDebugInfo: false,
    clusteringStrategy: null,
    contentManagementSearchParams: { itemGridColumnCount: 6 },
    shopId,
    postalCode: '01835',
    zoneId,
    first: 30,
  };

  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: SEARCH_HASH,
    },
  };

  const params = new URLSearchParams({
    operationName: 'SearchResultsPlacements',
    variables: JSON.stringify(variables),
    extensions: JSON.stringify(extensions),
  });

  const searchUrl = `https://www.instacart.com/graphql?${params.toString()}`;
  console.log('URL length:', searchUrl.length);

  const searchRes = await fetch(searchUrl, {
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json',
      'Cookie': cookies,
      'Referer': 'https://www.instacart.com/store/market-basket/search/milk',
    },
  });

  console.log('Status:', searchRes.status);
  const searchText = await searchRes.text();
  console.log('Response length:', searchText.length);

  if (searchRes.status !== 200) {
    console.log('Response:', searchText.substring(0, 500));
    return;
  }

  // Parse and extract products
  const searchData = JSON.parse(searchText);
  const placements = searchData.data?.searchResultsPlacements?.placements || [];
  console.log('Placements:', placements.length);

  let products = [];
  for (const placement of placements) {
    const items = placement.content?.placement?.items || placement.content?.items || [];
    for (const item of items) {
      if (item.name == null) continue;
      const vs = item.viewSection || {};
      products.push({
        name: item.name,
        price: vs.itemImage?.price || '',
        size: typeof vs.itemString === 'string' ? vs.itemString : '',
      });
    }
  }

  console.log(`Products: ${products.length}`);
  console.log('\nFirst 20:');
  products.slice(0, 20).forEach((p, i) => {
    console.log(`  ${i+1}. ${p.name} | ${p.price} | ${p.size}`);
  });

  // Test Items query (to get full product details including prices)
  if (products.length > 0) {
    console.log('\n=== Testing Items Query (for prices) ===');
    // Get item IDs from the search results
    const itemIds = [];
    for (const placement of placements) {
      const items = placement.content?.placement?.items || placement.content?.items || [];
      for (const item of items) {
        if (item.id) itemIds.push(item.id);
      }
    }

    if (itemIds.length > 0) {
      const itemVars = {
        ids: itemIds.slice(0, 10),
        shopId,
        zoneId,
        postalCode: '01835',
      };
      const itemExt = {
        persistedQuery: { version: 1, sha256Hash: ITEMS_HASH },
      };
      const itemParams = new URLSearchParams({
        operationName: 'Items',
        variables: JSON.stringify(itemVars),
        extensions: JSON.stringify(itemExt),
      });

      const itemsRes = await fetch(`https://www.instacart.com/graphql?${itemParams.toString()}`, {
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json',
          'Cookie': cookies,
        },
      });
      console.log('Items status:', itemsRes.status);
      const itemsText = await itemsRes.text();
      console.log('Items length:', itemsText.length);

      if (itemsRes.status === 200) {
        const priceMatches = itemsText.match(/\$\d+\.\d{2}/g);
        console.log('Prices found:', priceMatches?.length || 0);
        if (priceMatches) {
          console.log('Sample prices:', priceMatches.slice(0, 10).join(', '));
        }
      } else {
        console.log('Items response:', itemsText.substring(0, 300));
      }
    }
  }
}

main().catch(e => console.error('Error:', e.message));
