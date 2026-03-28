/**
 * Fix the bestPrice calculation to use filteredPrices instead of all prices.
 * Run on Pi: node fix-bestprice.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiPath = join(__dirname, 'services', 'sync-api.mjs');
let code = readFileSync(apiPath, 'utf8');

// The broken sed output collapsed everything onto one line.
// Find it and replace with proper multi-line code.

// Find the broken line
const brokenStart = '// Best price = lowest normalized cents (filtered to exclude outliers)';
const brokenEnd = ': null);';
const startIdx = code.indexOf(brokenStart);
const endIdx = code.indexOf(brokenEnd, startIdx);

if (startIdx < 0) {
  console.log('Broken pattern not found. Checking for original...');
  // Try the original pattern
  const origPattern = '// Best price = lowest normalized cents';
  const origIdx = code.indexOf(origPattern);
  if (origIdx < 0) {
    console.log('Neither pattern found. Aborting.');
    process.exit(1);
  }
  // Find the end of the bestPrice block (": null;")
  const origEnd = code.indexOf(': null;', origIdx);
  if (origEnd < 0) {
    console.log('Could not find end of bestPrice block. Aborting.');
    process.exit(1);
  }

  const before = code.slice(0, origIdx);
  const after = code.slice(origEnd + ': null;'.length);

  const replacement = `// Best price = lowest normalized cents (use filtered to exclude outliers)
            const filteredEnriched = filteredPrices.map(p => ({
              cents: p.price_cents,
              normalized_cents: normalizeCents(p.price_cents, p.price_unit),
              normalized_unit: normalizeUnit(p.price_unit),
              original_unit: p.price_unit || 'each',
              store: p.source_name,
              tier: p.confidence || p.pricing_tier || 'retail',
              pricing_tier: p.pricing_tier || 'retail',
              confirmed_at: p.last_confirmed_at || new Date().toISOString(),
              in_stock: p.in_stock === 1,
            }));
            const bestPrice = filteredEnriched.length > 0
              ? filteredEnriched.reduce((a, b) => a.normalized_cents < b.normalized_cents ? a : b)
              : (enrichedPrices.length > 0
                ? enrichedPrices.reduce((a, b) => a.normalized_cents < b.normalized_cents ? a : b)
                : null);`;

  code = before + replacement + after;
  writeFileSync(apiPath, code);
  console.log('Fixed from original pattern.');
  process.exit(0);
}

// Replace the broken one-liner
const before = code.slice(0, startIdx);
const after = code.slice(endIdx + brokenEnd.length);

const replacement = `// Best price = lowest normalized cents (use filtered to exclude outliers)
            const filteredEnriched = filteredPrices.map(p => ({
              cents: p.price_cents,
              normalized_cents: normalizeCents(p.price_cents, p.price_unit),
              normalized_unit: normalizeUnit(p.price_unit),
              original_unit: p.price_unit || 'each',
              store: p.source_name,
              tier: p.confidence || p.pricing_tier || 'retail',
              pricing_tier: p.pricing_tier || 'retail',
              confirmed_at: p.last_confirmed_at || new Date().toISOString(),
              in_stock: p.in_stock === 1,
            }));
            const bestPrice = filteredEnriched.length > 0
              ? filteredEnriched.reduce((a, b) => a.normalized_cents < b.normalized_cents ? a : b)
              : (enrichedPrices.length > 0
                ? enrichedPrices.reduce((a, b) => a.normalized_cents < b.normalized_cents ? a : b)
                : null);`;

code = before + replacement + after;
writeFileSync(apiPath, code);
console.log('Fixed broken one-liner bestPrice block.');
