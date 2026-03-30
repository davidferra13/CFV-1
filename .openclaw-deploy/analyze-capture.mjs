import { readFileSync } from 'fs';

const captures = JSON.parse(readFileSync('captured-responses.json', 'utf8'));
const searchResp = captures.find(c => c.url.includes('SearchResultsPlacements'));
const data = JSON.parse(searchResp.body);

const urlObj = new URL(searchResp.url);
const variables = JSON.parse(urlObj.searchParams.get('variables'));
const extensions = JSON.parse(urlObj.searchParams.get('extensions'));

console.log('=== THE KEY: Persisted Query Hash ===');
console.log('Hash:', extensions.persistedQuery.sha256Hash);
console.log('Session token:', variables.retailerInventorySessionToken);
console.log('Method: GET (not POST)');

const placements = data.data.searchResultsPlacements.placements || [];
let products = [];

for (const placement of placements) {
  const items = placement.content?.placement?.items || placement.content?.items || [];
  for (const item of items) {
    if (item.name == null) continue;
    const vs = item.viewSection || {};
    const priceStr = vs.itemImage?.price || '';
    const sizeStr = typeof vs.itemString === 'string' ? vs.itemString : '';
    products.push({
      name: item.name,
      price: priceStr,
      size: sizeStr,
      image: vs.itemImage?.url || vs.itemTransparentImage?.url || '',
      id: item.id || '',
    });
  }
}

console.log(`\nTotal products: ${products.length}`);
console.log('\n=== First 30 Products ===');
products.slice(0, 30).forEach((p, i) => {
  console.log(`${i+1}. ${p.name} | ${p.price} | ${p.size}`);
});

console.log('\n=== Replication Recipe for Pi ===');
console.log('URL format: GET /graphql?operationName=SearchResultsPlacements&variables=<encoded>&extensions=<encoded>');
console.log('Required variables:', Object.keys(variables).join(', '));
console.log('Key: retailerInventorySessionToken');
console.log('Full variables:', JSON.stringify(variables, null, 2));

// Also check Items query format
const itemsResp = captures.find(c => c.url.includes('operationName=Items'));
if (itemsResp) {
  const itemsUrl = new URL(itemsResp.url);
  const itemsExt = JSON.parse(itemsUrl.searchParams.get('extensions'));
  console.log('\nItems query hash:', itemsExt.persistedQuery.sha256Hash);
  const itemsVars = JSON.parse(itemsUrl.searchParams.get('variables'));
  console.log('Items variables:', JSON.stringify(itemsVars, null, 2).substring(0, 500));
}
