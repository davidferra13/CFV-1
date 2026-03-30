import { readFileSync } from 'fs';
import crypto from 'crypto';

const session = JSON.parse(readFileSync('/home/davidferra/openclaw-prices/data/captured-session.json', 'utf8'));
const COLLECTION_HASH = '5573f6ef85bfad81463b431985396705328c5ac3283c4e183aa36c6aad1afafe';
const ITEMS_HASH = '5116339819ff07f207fd38f949a8a7f58e52cc62223b535405b087e3076ebf2f';
const UA = 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36';

// Step 1: Get produce item IDs
const collParams = new URLSearchParams({
  operationName: 'CollectionProductsWithFeaturedProducts',
  variables: JSON.stringify({
    shopId: '137503', slug: 'produce', filters: [],
    pageViewId: crypto.randomUUID(),
    itemsDisplayType: 'collections_all_items_grid',
    first: 100, pageSource: 'collections',
    postalCode: '01830', zoneId: '143',
  }),
  extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: COLLECTION_HASH } }),
});

const collRes = await fetch(`https://www.instacart.com/graphql?${collParams}`, {
  headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Cookie': session.cookies,
    'Referer': 'https://www.instacart.com/store/market-basket/collections/produce' },
});
const collData = await collRes.json();

if (collData.errors) {
  console.log('COLLECTION ERRORS:', JSON.stringify(collData.errors).substring(0, 500));
  process.exit(1);
}

const cp = collData.data?.collectionProductsWithFeaturedProducts || collData.data?.collectionProducts;
console.log('Collection response top keys:', Object.keys(collData.data || {}));

// Find item IDs - try multiple paths
let itemIds = cp?.itemIds || cp?.items?.map(i => i.id) || [];
if (itemIds.length === 0) {
  // Dump full structure to find where IDs live
  console.log('No itemIds found. Full response preview:');
  console.log(JSON.stringify(collData.data).substring(0, 3000));
  process.exit(1);
}

console.log(`Got ${itemIds.length} item IDs. First 5:`, itemIds.slice(0, 5));

// Step 2: Fetch first batch with Items hash
const batch = itemIds.slice(0, 8);
console.log('\nFetching Items batch:', batch);

const itemParams = new URLSearchParams({
  operationName: 'Items',
  variables: JSON.stringify({ ids: batch }),
  extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: ITEMS_HASH } }),
});

const itemRes = await fetch(`https://www.instacart.com/graphql?${itemParams}`, {
  headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Cookie': session.cookies,
    'Referer': 'https://www.instacart.com/store/market-basket/storefront' },
});

const itemData = await itemRes.json();
console.log('Items status:', itemRes.status);

if (itemData.errors) {
  console.log('ITEMS ERRORS:', JSON.stringify(itemData.errors).substring(0, 500));
} else {
  console.log('\nItems response top keys:', Object.keys(itemData.data || {}));

  // Try multiple paths to find the actual items
  const items = itemData.data?.items || [];
  console.log('items array length:', items.length);

  if (items.length > 0) {
    const first = items[0];
    console.log('\n=== FIRST ITEM STRUCTURE ===');
    console.log('Top-level keys:', Object.keys(first));
    console.log('name:', first.name);
    console.log('id:', first.id);
    console.log('brand:', first.brand);
    console.log('size:', first.size);

    // Price exploration - try all possible paths
    console.log('\n=== PRICE FIELDS ===');
    console.log('price:', JSON.stringify(first.price)?.substring(0, 300));
    console.log('pricing:', JSON.stringify(first.pricing)?.substring(0, 300));
    console.log('viewSection:', JSON.stringify(first.viewSection)?.substring(0, 500));
    console.log('priceString:', first.priceString);

    // Look for price in nested objects
    const fullJson = JSON.stringify(first);
    const priceMatch = fullJson.match(/"priceString"\s*:\s*"([^"]+)"/);
    const amountMatch = fullJson.match(/"amount"\s*:\s*(\d+\.?\d*)/);
    console.log('\npriceString regex match:', priceMatch?.[1]);
    console.log('amount regex match:', amountMatch?.[1]);

    // Dump first item fully (truncated)
    console.log('\n=== FULL FIRST ITEM (truncated) ===');
    console.log(fullJson.substring(0, 2000));
  } else {
    // No items array - dump full response
    console.log('\n=== FULL RESPONSE (no items array) ===');
    console.log(JSON.stringify(itemData.data).substring(0, 3000));
  }
}
