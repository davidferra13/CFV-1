/**
 * Patch: Fix Instacart chain slugs and add new chains
 * Run on Pi: node patch-walker-chains.mjs
 *
 * Fixes:
 *   - shaws storeSlug: 'shaws' -> 'shaw' (404 fix)
 *   - bjs-wholesale-club: add alias 'bjs'
 *   - Add: brothers-marketplace, roche-bros, the-fresh-market
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WALKER_PATH = join(__dirname, 'instacart-department-walker.mjs');
const CATALOG_WALKER_PATH = join(__dirname, 'instacart-catalog-walker.mjs');

function patchFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  const original = content;

  // Fix Shaw's storeSlug
  content = content.replace(
    "'shaws': { chainSlug: 'shaws', name: \"Shaw's\", markupPct: 15, storeSlug: 'shaws' }",
    "'shaws': { chainSlug: 'shaws', name: \"Shaw's\", markupPct: 15, storeSlug: 'shaw' }"
  );
  // Also fix if it's 'shaw' as cron slug
  content = content.replace(
    "'shaw': { chainSlug: 'shaws', name: \"Shaw's\", markupPct: 15, storeSlug: 'shaw' }",
    "'shaw': { chainSlug: 'shaws', name: \"Shaw's\", markupPct: 15, storeSlug: 'shaw' }"
  );

  // Fix BJ's - add 'bjs' as alias pointing to same config
  if (content.includes("'bjs-wholesale-club':") && !content.includes("'bjs':")) {
    content = content.replace(
      "'bjs-wholesale-club': { chainSlug: 'bjs', name: \"BJ's\", markupPct: 18, storeSlug: 'bjs' }",
      "'bjs-wholesale-club': { chainSlug: 'bjs', name: \"BJ's\", markupPct: 18, storeSlug: 'bjs' },\n  'bjs': { chainSlug: 'bjs', name: \"BJ's\", markupPct: 18, storeSlug: 'bjs' }"
    );
  }

  // Add new chains before the closing brace of INSTACART_CHAINS
  const newChains = `
  'brothers-marketplace': { chainSlug: 'brothers_marketplace', name: 'Brothers Marketplace', markupPct: 15, storeSlug: 'brothers-marketplace' },
  'roche-bros': { chainSlug: 'roche_bros', name: 'Roche Bros', markupPct: 12, storeSlug: 'roche-bros' },
  'the-fresh-market': { chainSlug: 'the_fresh_market', name: 'The Fresh Market', markupPct: 10, storeSlug: 'the-fresh-market' },`;

  // Insert before the closing '};' of INSTACART_CHAINS
  if (!content.includes("'brothers-marketplace'")) {
    // Find the last entry before the closing };
    const lastEntry = content.lastIndexOf("storeSlug: 'price-chopper'");
    if (lastEntry > -1) {
      const closingBrace = content.indexOf('}', lastEntry);
      const insertPoint = content.indexOf(',', closingBrace);
      if (insertPoint > -1) {
        content = content.slice(0, insertPoint + 1) + newChains + content.slice(insertPoint + 1);
      }
    }
  }

  if (content !== original) {
    writeFileSync(filePath, content);
    console.log('Patched: ' + filePath);
    return true;
  }
  console.log('No changes needed: ' + filePath);
  return false;
}

// Patch both walkers
patchFile(WALKER_PATH);

// Check if catalog walker also has the chain map
try {
  const catContent = readFileSync(CATALOG_WALKER_PATH, 'utf8');
  if (catContent.includes('INSTACART_CHAINS')) {
    patchFile(CATALOG_WALKER_PATH);
  }
} catch {}

console.log('Done.');
