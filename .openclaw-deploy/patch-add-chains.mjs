/**
 * Patch: Add new chains to Instacart walkers
 *
 * Adding 6 new food-relevant chains:
 * - star-markets (Star Market - major NE grocery)
 * - pricerite (Price Rite - discount grocer)
 * - eataly (Eataly - specialty Italian)
 * - jetro-restaurant-depot (Restaurant Depot - wholesale, pickup only)
 * - cvs (CVS - has grocery/pharmacy)
 * - 711 (7-Eleven - convenience, baseline pricing)
 *
 * Run on Pi: node patch-add-chains.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const NEW_CHAINS = `
  'star-markets': { chainSlug: 'star_market', name: 'Star Market', markupPct: 12, storeSlug: 'star-markets' },
  'pricerite': { chainSlug: 'price_rite', name: 'Price Rite', markupPct: 5, storeSlug: 'pricerite' },
  'eataly': { chainSlug: 'eataly', name: 'Eataly', markupPct: 20, storeSlug: 'eataly' },
  'jetro-restaurant-depot': { chainSlug: 'restaurant_depot', name: 'Restaurant Depot', markupPct: 0, storeSlug: 'jetro-restaurant-depot' },
  'cvs': { chainSlug: 'cvs', name: 'CVS', markupPct: 25, storeSlug: 'cvs' },
  '711': { chainSlug: 'seven_eleven', name: '7-Eleven', markupPct: 30, storeSlug: '711' },`;

function patchFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  const original = content;

  // Already patched?
  if (content.includes("'star-markets'")) {
    console.log(`Already patched: ${filePath}`);
    return false;
  }

  // Find the last chain entry (the-fresh-market) and add after it
  const lastChain = "'the-fresh-market'";
  const idx = content.indexOf(lastChain);
  if (idx === -1) {
    console.log(`Could not find ${lastChain} in ${filePath}`);
    return false;
  }

  // Find the end of that line (after the closing brace + comma)
  const lineEnd = content.indexOf('\n', content.indexOf('},', idx));
  if (lineEnd === -1) {
    console.log('Could not find end of the-fresh-market line');
    return false;
  }

  content = content.slice(0, lineEnd) + NEW_CHAINS + content.slice(lineEnd);

  if (content !== original) {
    writeFileSync(filePath, content);
    console.log('Patched: ' + filePath);
    return true;
  }
  console.log('No changes needed: ' + filePath);
  return false;
}

const servicesDir = join(__dirname, 'services');
console.log('=== Adding 6 new chains to walkers ===');
patchFile(join(servicesDir, 'instacart-department-walker.mjs'));
patchFile(join(servicesDir, 'instacart-catalog-walker.mjs'));
console.log('Done. New chains: star-markets, pricerite, eataly, jetro-restaurant-depot, cvs, 711');
