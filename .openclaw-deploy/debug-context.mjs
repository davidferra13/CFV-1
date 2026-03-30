import { readFileSync } from 'fs';

const session = JSON.parse(readFileSync('/home/davidferra/openclaw-prices/data/captured-session.json', 'utf8'));

const res = await fetch('https://www.instacart.com/store/market-basket/storefront', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36',
    'Accept': 'text/html',
    'Cookie': session.cookies,
  },
});

const html = await res.text();
console.log('Status:', res.status, 'Length:', html.length);

// Try multiple patterns for shopId
const patterns = [
  [/shopId["']\s*:\s*["']?(\d+)/, 'shopId key'],
  [/shop_id["']\s*:\s*["']?(\d+)/, 'shop_id key'],
  [/"shopId":"(\d+)"/, 'JSON shopId'],
  [/shopId%22%3A%22(\d+)/, 'URL-encoded shopId'],
  [/shopId=(\d+)/, 'shopId= param'],
  [/137503/, 'literal 137503'],
];

for (const [p, label] of patterns) {
  const m = html.match(p);
  if (m) console.log(`Found [${label}]:`, m[0].substring(0, 60));
}

// Check for zone
const zonePatterns = [
  [/zoneId["']\s*:\s*["']?(\d+)/, 'zoneId key'],
  [/"zoneId":"(\d+)"/, 'JSON zoneId'],
  [/zoneId%22%3A%22(\d+)/, 'URL-encoded zoneId'],
];

for (const [p, label] of zonePatterns) {
  const m = html.match(p);
  if (m) console.log(`Found [${label}]:`, m[0].substring(0, 60));
}

// Check for token
const tokenPatterns = [
  [/retailerInventorySessionToken["']\s*:\s*["']([^"']+)["']/, 'token key'],
  [/retailerInventorySessionToken%22%3A%22([^%]+)/, 'token URL-encoded'],
];

for (const [p, label] of tokenPatterns) {
  const m = html.match(p);
  if (m) console.log(`Found [${label}]:`, m[1].substring(0, 50));
}

// Show a snippet around any "shopId" occurrence
const idx = html.indexOf('shopId');
if (idx >= 0) {
  console.log('\nContext around shopId:', html.substring(idx - 30, idx + 50));
}

// Also check the search walker that IS working right now
console.log('\n--- Checking running walker session context ---');
// The working walker extracts from inline scripts
const scriptBlocks = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
console.log('Script blocks:', scriptBlocks.length);
for (const block of scriptBlocks) {
  if (block.includes('shopId') || block.includes('zoneId')) {
    console.log('Found in script block (preview):', block.substring(0, 200));
  }
}
