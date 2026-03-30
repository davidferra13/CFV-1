import { readFileSync } from 'fs';
import crypto from 'crypto';

const session = JSON.parse(readFileSync('/home/davidferra/openclaw-prices/data/captured-session.json', 'utf8'));
const cookies = session.cookies;
const UA = session.ua || 'Mozilla/5.0';

const storeRes = await fetch('https://www.instacart.com/store/market-basket/storefront', {
  headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Cookie': cookies },
});
const html = await storeRes.text();
const tokenMatch = html.match(/retailerInventorySessionToken%22%3A%22([^%"]+)/);
const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : '';

const vars = {
  filters: [], action: null, query: 'milk', pageViewId: crypto.randomUUID(),
  retailerInventorySessionToken: token, elevatedProductId: null, searchSource: 'search',
  disableReformulation: false, disableLlm: false, forceInspiration: false, orderBy: 'bestMatch',
  clusterId: null, includeDebugInfo: false, clusteringStrategy: null,
  contentManagementSearchParams: { itemGridColumnCount: 6 },
  shopId: '137503', postalCode: '01835', zoneId: '143', first: 60,
};
const ext = { persistedQuery: { version: 1, sha256Hash: '95c5336c23ebbb52b5d5c63c28b0bb8ef1ae5adc191c334883b357a94701ff59' } };
const params = new URLSearchParams({
  operationName: 'SearchResultsPlacements',
  variables: JSON.stringify(vars),
  extensions: JSON.stringify(ext),
});

const res = await fetch('https://www.instacart.com/graphql?' + params.toString(), {
  headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Cookie': cookies },
});
const data = await res.json();
const placements = data.data?.searchResultsPlacements?.placements || [];

// Find ALL dollar amounts in first item
for (const p of placements.slice(0, 3)) {
  const items = p.content?.placement?.items || p.content?.items || [];
  if (items.length === 0) continue;

  const item = items[0];
  const str = JSON.stringify(item);
  const dollars = str.match(/\$\d+\.\d{2}/g);
  console.log(item.name, '-> dollar values:', dollars?.join(', ') || 'NONE');

  // Recursive find all price-like string values
  function findPrices(obj, path = '') {
    if (obj === null || obj === undefined) return;
    if (typeof obj === 'string') {
      if (obj.match(/^\$\d/) || obj.match(/^\d+\.\d{2}$/)) {
        console.log(`  ${path} = "${obj}"`);
      }
      return;
    }
    if (typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => findPrices(v, `${path}[${i}]`));
      return;
    }
    for (const [k, v] of Object.entries(obj)) {
      findPrices(v, path ? `${path}.${k}` : k);
    }
  }

  findPrices(item);
  console.log('---');
}
