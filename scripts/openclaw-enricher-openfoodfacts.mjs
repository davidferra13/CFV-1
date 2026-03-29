/**
 * OpenClaw - Open Food Facts Enricher
 *
 * Enriches canonical_ingredients with product images, barcodes, and nutrition
 * data from Open Food Facts (free, open database, 3M+ products).
 *
 * Strategy:
 * 1. Load all canonical_ingredients that don't have off_image_url yet
 * 2. Search Open Food Facts by product name
 * 3. Store: image URL, barcode, basic nutrition JSON
 *
 * Rate limit: ~100 req/min (be polite to the free API)
 * Run: weekly (Sunday) via cron
 */

import { getDb } from '../lib/db.mjs';

const OFF_API = 'https://world.openfoodfacts.org';
const BATCH_SIZE = 50;
const DELAY_MS = 700; // ~85 req/min, well under 100

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function searchOFF(query) {
  const url = `${OFF_API}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=3&fields=code,product_name,image_front_url,image_front_small_url,nutriments,brands,categories_tags`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'OpenClaw-PriceIntel/1.0 (contact: davidferra13@gmail.com)'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.products || [];
  } catch (err) {
    console.error(`[OFF] Search failed for "${query}":`, err.message);
    return null;
  }
}

function bestMatch(products, ingredientName) {
  if (!products || products.length === 0) return null;

  const nameLower = ingredientName.toLowerCase();

  // Prefer products with images
  const withImages = products.filter(p => p.image_front_url || p.image_front_small_url);
  const pool = withImages.length > 0 ? withImages : products;

  // Simple best match: shortest product name that contains our ingredient name
  // or first result if none contain it
  const containing = pool.filter(p =>
    (p.product_name || '').toLowerCase().includes(nameLower)
  );

  return containing.length > 0 ? containing[0] : pool[0];
}

async function main() {
  const db = getDb();

  // Get all ingredients without OFF enrichment
  const unenriched = db.prepare(`
    SELECT ingredient_id, name, category
    FROM canonical_ingredients
    WHERE off_image_url IS NULL
    ORDER BY ingredient_id
  `).all();

  console.log(`[OFF Enricher] ${unenriched.length} ingredients need enrichment`);

  if (unenriched.length === 0) {
    console.log('[OFF Enricher] All ingredients already enriched. Done.');
    return;
  }

  const updateStmt = db.prepare(`
    UPDATE canonical_ingredients
    SET off_image_url = ?, off_barcode = ?, off_nutrition_json = ?
    WHERE ingredient_id = ?
  `);

  // Mark as "checked but not found" so we don't re-check every run
  const markChecked = db.prepare(`
    UPDATE canonical_ingredients
    SET off_image_url = 'none'
    WHERE ingredient_id = ?
  `);

  let enriched = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < unenriched.length; i++) {
    const ing = unenriched[i];

    if (i > 0 && i % 100 === 0) {
      console.log(`[OFF Enricher] Progress: ${i}/${unenriched.length} (enriched: ${enriched}, not found: ${notFound})`);
    }

    const products = await searchOFF(ing.name);

    if (products === null) {
      errors++;
      if (errors > 10) {
        console.error('[OFF Enricher] Too many errors, stopping.');
        break;
      }
      await sleep(DELAY_MS * 2);
      continue;
    }

    const match = bestMatch(products, ing.name);

    if (match && (match.image_front_url || match.image_front_small_url)) {
      const imageUrl = match.image_front_url || match.image_front_small_url;
      const barcode = match.code || null;
      const nutrition = match.nutriments ? JSON.stringify({
        energy_kcal: match.nutriments['energy-kcal_100g'],
        fat: match.nutriments.fat_100g,
        carbs: match.nutriments.carbohydrates_100g,
        protein: match.nutriments.proteins_100g,
        fiber: match.nutriments.fiber_100g,
        sodium: match.nutriments.sodium_100g,
      }) : null;

      updateStmt.run(imageUrl, barcode, nutrition, ing.ingredient_id);
      enriched++;
    } else {
      markChecked.run(ing.ingredient_id);
      notFound++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n[OFF Enricher] Complete:`);
  console.log(`  Enriched with images: ${enriched}`);
  console.log(`  Not found in OFF: ${notFound}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Remaining: ${unenriched.length - enriched - notFound - errors}`);
}

main().catch(err => {
  console.error('[OFF Enricher] Fatal error:', err);
  process.exit(1);
});
