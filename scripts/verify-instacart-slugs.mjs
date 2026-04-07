/**
 * OpenClaw - Instacart Slug Verification
 *
 * Checks every chain slug against Instacart's website to verify
 * the slug actually resolves to a store page. No Puppeteer needed,
 * just HTTP HEAD/GET requests.
 *
 * Instacart URL pattern: https://www.instacart.com/store/{slug}
 * - 200/301/302 = valid store
 * - 404/redirects to homepage = invalid slug
 *
 * Usage: node scripts/verify-instacart-slugs.mjs
 *        node scripts/verify-instacart-slugs.mjs --fix  (suggest corrections)
 *
 * Output: JSON report of valid/invalid/redirect slugs
 */

const INSTACART_BASE = 'https://www.instacart.com/store';

// Import the nationwide store registry
const { CHAIN_DEFINITIONS } = await import('../.openclaw-build/services/nationwide-stores.mjs');

// Get unique slugs (deduplicate)
const seen = new Set();
const slugsToCheck = [];
for (const chain of CHAIN_DEFINITIONS) {
  if (!seen.has(chain.slug)) {
    seen.add(chain.slug);
    slugsToCheck.push({ slug: chain.slug, name: chain.name, chainSlug: chain.chainSlug });
  }
}

console.log(`=== Instacart Slug Verification ===`);
console.log(`Chains to verify: ${slugsToCheck.length}`);
console.log(`Time: ${new Date().toISOString()}`);
console.log('');

const results = {
  valid: [],
  invalid: [],
  redirect: [],
  error: [],
  skipped: [],
};

// Slugs we know aren't on Instacart (wholesale, manual-only, own delivery)
const SKIP_SLUGS = new Set([
  'aldi-nord',        // Trader Joe's - own delivery
  'dollar-general',   // not on Instacart
  'dollar-tree',      // not on Instacart
  'family-dollar',    // not on Instacart
  'five-below',       // not on Instacart
  'ocean-state',      // not on Instacart
  'sharp-shopper',    // not on Instacart
  'ollies',           // not on Instacart
]);

async function checkSlug(slug, name) {
  if (SKIP_SLUGS.has(slug)) {
    results.skipped.push({ slug, name, reason: 'known non-Instacart' });
    return;
  }

  const url = `${INSTACART_BASE}/${slug}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual', // Don't follow redirects - we want to see them
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const status = res.status;
    const location = res.headers.get('location') || '';

    if (status === 200) {
      // Check if the page actually has store content (not a soft 404)
      const body = await res.text();
      const hasStoreContent = body.includes('store') && (
        body.includes('departments') ||
        body.includes('aisle') ||
        body.includes('delivery') ||
        body.includes('pickup') ||
        body.includes(slug)
      );

      if (hasStoreContent) {
        results.valid.push({ slug, name, status });
      } else {
        // 200 but no store content = soft 404
        results.invalid.push({ slug, name, status, reason: 'soft 404 (200 but no store content)' });
      }
    } else if (status === 301 || status === 302) {
      // Redirect - check where it goes
      if (location.includes('/store/') && !location.endsWith('/store/')) {
        // Redirects to another store slug - this IS a valid redirect
        const newSlug = location.split('/store/')[1]?.split('/')[0]?.split('?')[0];
        results.redirect.push({ slug, name, status, redirectTo: newSlug || location });
      } else if (location === '/' || location === 'https://www.instacart.com/' || location.includes('/store')) {
        // Redirects to homepage or store listing = invalid
        results.invalid.push({ slug, name, status, reason: `redirects to ${location}` });
      } else {
        results.redirect.push({ slug, name, status, redirectTo: location });
      }
    } else if (status === 404) {
      results.invalid.push({ slug, name, status, reason: '404' });
    } else {
      results.error.push({ slug, name, status, reason: `unexpected status ${status}` });
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      results.error.push({ slug, name, reason: 'timeout (15s)' });
    } else {
      results.error.push({ slug, name, reason: err.message });
    }
  }
}

// Process in batches of 5 with delays to avoid rate limiting
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 3000;
const INTER_REQUEST_MS = 500;

for (let i = 0; i < slugsToCheck.length; i += BATCH_SIZE) {
  const batch = slugsToCheck.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(slugsToCheck.length / BATCH_SIZE);

  process.stdout.write(`[${batchNum}/${totalBatches}] Checking: ${batch.map(s => s.slug).join(', ')}...`);

  // Run batch concurrently
  await Promise.all(batch.map(s => checkSlug(s.slug, s.name)));

  const v = results.valid.length;
  const inv = results.invalid.length;
  const r = results.redirect.length;
  const e = results.error.length;
  console.log(` (valid: ${v}, invalid: ${inv}, redirect: ${r}, error: ${e})`);

  // Delay between batches
  if (i + BATCH_SIZE < slugsToCheck.length) {
    await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }
}

// ── REPORT ──
console.log('\n' + '═'.repeat(70));
console.log('RESULTS');
console.log('═'.repeat(70));

console.log(`\n✓ VALID (${results.valid.length}):`);
for (const r of results.valid) {
  console.log(`  ${r.slug} (${r.name})`);
}

console.log(`\n→ REDIRECT (${results.redirect.length}):`);
for (const r of results.redirect) {
  console.log(`  ${r.slug} (${r.name}) → ${r.redirectTo}`);
}

console.log(`\n✗ INVALID (${results.invalid.length}):`);
for (const r of results.invalid) {
  console.log(`  ${r.slug} (${r.name}) - ${r.reason}`);
}

console.log(`\n⚠ ERROR (${results.error.length}):`);
for (const r of results.error) {
  console.log(`  ${r.slug} (${r.name}) - ${r.reason}`);
}

console.log(`\n⊘ SKIPPED (${results.skipped.length}):`);
for (const r of results.skipped) {
  console.log(`  ${r.slug} (${r.name}) - ${r.reason}`);
}

console.log('\n' + '═'.repeat(70));
console.log(`SUMMARY: ${results.valid.length} valid, ${results.redirect.length} redirects, ${results.invalid.length} invalid, ${results.error.length} errors, ${results.skipped.length} skipped`);
console.log('═'.repeat(70));

// ── WRITE JSON REPORT ──
const reportPath = 'docs/instacart-slug-verification.json';
const report = {
  timestamp: new Date().toISOString(),
  total: slugsToCheck.length,
  ...results,
  summary: {
    valid: results.valid.length,
    redirect: results.redirect.length,
    invalid: results.invalid.length,
    error: results.error.length,
    skipped: results.skipped.length,
  },
};

const { writeFileSync } = await import('fs');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nReport saved to ${reportPath}`);

// ── SUGGEST FIXES FOR REDIRECTS ──
if (results.redirect.length > 0) {
  console.log('\n── SUGGESTED FIXES (redirects) ──');
  console.log('Update these slugs in nationwide-stores.mjs:');
  for (const r of results.redirect) {
    if (r.redirectTo && !r.redirectTo.startsWith('http')) {
      console.log(`  '${r.slug}' → '${r.redirectTo}'`);
    }
  }
}

// ── SUGGEST REMOVAL FOR INVALID ──
if (results.invalid.length > 0) {
  console.log('\n── NEEDS INVESTIGATION (invalid) ──');
  console.log('These slugs did not resolve. Find the correct Instacart slug or mark as non-Instacart:');
  for (const r of results.invalid) {
    console.log(`  ${r.slug} (${r.name})`);
  }
}
