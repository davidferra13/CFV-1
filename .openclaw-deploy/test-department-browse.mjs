/**
 * Test the CollectionProductsWithFeaturedProducts hash for department browsing.
 * If this works, we can get ALL products per department without search guessing.
 */

import { readFileSync } from 'fs';
import crypto from 'crypto';

const COLLECTION_HASH = '5573f6ef85bfad81463b431985396705328c5ac3283c4e183aa36c6aad1afafe';
const SHOP_COLLECTION_HASH = 'c6a0fcb3d1a4a14e5800cc6c38e736e85177f80f0c01a5535646f83238e65bcb';

const SESSION_PATHS = [
  '/home/davidferra/openclaw-prices/data/captured-session.json',
  '/home/davidferra/openclaw-prices/data/instacart-session.json',
];

function loadSession() {
  for (const p of SESSION_PATHS) {
    try {
      return JSON.parse(readFileSync(p, 'utf8'));
    } catch {}
  }
  return null;
}

const UA = 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function fetchGQL(cookies, opName, hash, variables) {
  const params = new URLSearchParams({
    operationName: opName,
    variables: JSON.stringify(variables),
    extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: hash } }),
  });

  const res = await fetch(`https://www.instacart.com/graphql?${params}`, {
    method: 'GET',
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json',
      'Cookie': cookies,
      'Referer': 'https://www.instacart.com/store/market-basket/collections/produce',
    },
  });

  return { status: res.status, data: await res.json() };
}

async function main() {
  const session = loadSession();
  if (!session) { console.error('No session'); process.exit(1); }
  console.log('Session loaded');

  // Market Basket departments (from capture)
  const departments = [
    'produce',
    'meat-and-seafood',
    'dairy',
    'snacks-and-candy',
    'frozen',
    'beverages',
    '3089-deli',
    'household',
    'baked-goods',
    'canned-goods',
    '3095-prepared-foods',
    'dry-goods-pasta',
    'breakfast-foods',
    'condiments-sauces',
    'baking-essentials',
    'oils-vinegars-spices',
    'pets',
    'personal-care',
    'kitchen-supplies',
    'health-care',
  ];

  // First, get the departments list via ShopCollectionScoped
  console.log('\n=== Test 1: ShopCollectionScoped (department list) ===');
  const deptResult = await fetchGQL(session.cookies, 'ShopCollectionScoped', SHOP_COLLECTION_HASH, {
    retailerSlug: 'market-basket',
    postalCode: '01830',
    coordinates: { latitude: 42.7758, longitude: -71.0741 },
    addressId: null,
    allowCanonicalFallback: true,
  });
  console.log(`Status: ${deptResult.status}`);
  if (deptResult.data.errors) {
    console.log('Errors:', JSON.stringify(deptResult.data.errors).substring(0, 500));
  } else {
    const collections = deptResult.data?.data?.shopCollectionScoped?.collections || [];
    console.log(`Collections found: ${collections.length}`);
    collections.forEach(c => console.log(`  ${c.slug || c.name || JSON.stringify(c).substring(0, 100)}`));
  }

  // Test CollectionProductsWithFeaturedProducts with different first values
  console.log('\n=== Test 2: CollectionProductsWithFeaturedProducts (produce, first=100) ===');
  const produceResult = await fetchGQL(session.cookies, 'CollectionProductsWithFeaturedProducts', COLLECTION_HASH, {
    shopId: '137503',
    slug: 'produce',
    filters: [],
    pageViewId: crypto.randomUUID(),
    itemsDisplayType: 'collections_all_items_grid',
    first: 100,  // Try 100 instead of default 20
    pageSource: 'collections',
    postalCode: '01830',
    zoneId: '143',
  });
  console.log(`Status: ${produceResult.status}`);
  if (produceResult.data.errors) {
    console.log('Errors:', JSON.stringify(produceResult.data.errors).substring(0, 500));
  } else {
    // Count products
    const data = produceResult.data?.data;
    const keys = Object.keys(data || {});
    console.log('Top-level keys:', keys);

    // Try to find products in the response
    const json = JSON.stringify(data);
    const nameCount = (json.match(/"name"/g) || []).length;
    const priceCount = (json.match(/priceString/g) || []).length;
    console.log(`Names: ${nameCount}, Prices: ${priceCount}`);
    console.log(`Response size: ${json.length} bytes`);

    // Try to extract product items
    const items = data?.collectionProductsWithFeaturedProducts?.items ||
                  data?.collectionProductsWithFeaturedProducts?.edges ||
                  [];
    console.log(`Items array: ${items.length}`);

    // Check for pagination info
    const pageInfo = data?.collectionProductsWithFeaturedProducts?.pageInfo;
    if (pageInfo) {
      console.log('PageInfo:', JSON.stringify(pageInfo));
    }

    // Show first few products
    if (items.length > 0) {
      console.log('\nFirst 10 products:');
      items.slice(0, 10).forEach((item, i) => {
        const name = item.name || item.node?.name || 'unknown';
        console.log(`  ${i+1}. ${JSON.stringify(item).substring(0, 200)}`);
      });
    } else {
      // Dump a preview of the response structure
      console.log('Response preview:', JSON.stringify(data).substring(0, 2000));
    }
  }

  // Test with first=500 to see if we can get more
  console.log('\n=== Test 3: produce first=500 ===');
  const bigResult = await fetchGQL(session.cookies, 'CollectionProductsWithFeaturedProducts', COLLECTION_HASH, {
    shopId: '137503',
    slug: 'produce',
    filters: [],
    pageViewId: crypto.randomUUID(),
    itemsDisplayType: 'collections_all_items_grid',
    first: 500,
    pageSource: 'collections',
    postalCode: '01830',
    zoneId: '143',
  });
  console.log(`Status: ${bigResult.status}`);
  const bigJson = JSON.stringify(bigResult.data?.data);
  const bigNames = (bigJson.match(/"name"/g) || []).length;
  const bigPrices = (bigJson.match(/priceString/g) || []).length;
  console.log(`Names: ${bigNames}, Prices: ${bigPrices}, Size: ${bigJson.length}b`);

  // Test pagination with after cursor
  const pageInfo2 = bigResult.data?.data?.collectionProductsWithFeaturedProducts?.pageInfo;
  if (pageInfo2) console.log('PageInfo:', JSON.stringify(pageInfo2));

  // Test another department
  console.log('\n=== Test 4: meat-and-seafood first=500 ===');
  const meatResult = await fetchGQL(session.cookies, 'CollectionProductsWithFeaturedProducts', COLLECTION_HASH, {
    shopId: '137503',
    slug: 'meat-and-seafood',
    filters: [],
    pageViewId: crypto.randomUUID(),
    itemsDisplayType: 'collections_all_items_grid',
    first: 500,
    pageSource: 'collections',
    postalCode: '01830',
    zoneId: '143',
  });
  console.log(`Status: ${meatResult.status}`);
  const meatJson = JSON.stringify(meatResult.data?.data);
  const meatNames = (meatJson.match(/"name"/g) || []).length;
  const meatPrices = (meatJson.match(/priceString/g) || []).length;
  console.log(`Names: ${meatNames}, Prices: ${meatPrices}, Size: ${meatJson.length}b`);
}

main().catch(err => console.error('FATAL:', err));
