#!/usr/bin/env node
/**
 * Normalization Map Expansion
 * Finds food products that match canonical ingredient names but aren't linked.
 * Inserts new normalization links to increase multi-source coverage.
 *
 * Run: node scripts/norm-expand.cjs [--dry-run] [--limit=500]
 */
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres', { connect_timeout: 10 });

const isDryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 500;

// Food categories only
const FOOD_CATS = [
  'Produce','Protein','Meat & Seafood','Dairy','Bakery','Grains & Bakery',
  'Pantry','Frozen','Deli','Prepared Foods','Snacks & Candy','Snacks',
  'Condiments & Sauces','Oils, Vinegars, & Spices','Baking Essentials',
  'Dry Goods & Pasta','Canned Goods & Soups','Beverages','Breakfast',
];

async function main() {
  const startTime = Date.now();
  process.stderr.write(`=== Normalization Map Expansion ===\n`);
  process.stderr.write(`Dry run: ${isDryRun}\n\n`);

  // Find single-source food ingredients
  const singleSource = await sql`
    SELECT ci.ingredient_id, ci.name, ci.category
    FROM openclaw.canonical_ingredients ci
    JOIN openclaw.normalization_map nm ON nm.canonical_ingredient_id = ci.ingredient_id
    WHERE ci.category = ANY(${FOOD_CATS})
      AND LENGTH(ci.name) >= 6
    GROUP BY ci.ingredient_id, ci.name, ci.category
    HAVING COUNT(nm.raw_name) = 1
    ORDER BY RANDOM()
    LIMIT ${LIMIT}
  `;
  process.stderr.write(`Found ${singleSource.length} single-source food ingredients\n\n`);

  let totalNewLinks = 0;
  let totalInserted = 0;
  let processed = 0;

  for (const ci of singleSource) {
    const searchName = ci.name.toLowerCase();

    // Find food products containing this ingredient name, with prices
    const candidates = await sql`
      SELECT p.name, COUNT(sp.id)::int as price_count
      FROM openclaw.products p
      JOIN openclaw.store_products sp ON sp.product_id = p.id AND sp.price_cents > 0
      WHERE p.is_food = true
        AND LOWER(p.name) LIKE '%' || ${searchName} || '%'
        AND LENGTH(p.name) < 100
        AND LENGTH(p.name) > ${searchName.length + 2}
      GROUP BY p.name
      HAVING COUNT(sp.id) >= 2
      LIMIT 10
    `;

    // Filter: only keep candidates not already in norm_map
    const newCandidates = [];
    for (const c of candidates) {
      const exists = await sql`
        SELECT 1 FROM openclaw.normalization_map WHERE raw_name = ${c.name.trim()} LIMIT 1
      `;
      if (exists.length === 0) newCandidates.push(c);
    }

    if (newCandidates.length > 0) {
      totalNewLinks += newCandidates.length;

      if (!isDryRun) {
        for (const c of newCandidates) {
          try {
            await sql`
              INSERT INTO openclaw.normalization_map (raw_name, canonical_ingredient_id, match_method, confidence)
              VALUES (${c.name.trim()}, ${ci.ingredient_id}, 'fuzzy_substring', 0.6)
              ON CONFLICT DO NOTHING
            `;
            totalInserted++;
          } catch { /* skip conflicts */ }
        }
      }
    }

    processed++;
    if (processed % 50 === 0) {
      process.stderr.write(`  ${processed}/${singleSource.length}: ${totalNewLinks} new links\n`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  process.stderr.write(`\n=== EXPANSION COMPLETE ===\n`);
  process.stderr.write(`Ingredients checked: ${processed}\n`);
  process.stderr.write(`New links found: ${totalNewLinks}\n`);
  process.stderr.write(`Inserted: ${isDryRun ? 'N/A (dry run)' : totalInserted}\n`);
  process.stderr.write(`Elapsed: ${elapsed}s\n`);

  if (!isDryRun && totalInserted > 0) {
    const multi = await sql`
      SELECT COUNT(*)::int as multi FROM (
        SELECT canonical_ingredient_id
        FROM openclaw.normalization_map
        GROUP BY canonical_ingredient_id
        HAVING COUNT(*) >= 2
      ) sub
    `;
    process.stderr.write(`Multi-source ingredients: ${multi[0].multi}\n`);
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    checked: processed, new_links: totalNewLinks,
    inserted: isDryRun ? 0 : totalInserted,
    dry_run: isDryRun, elapsed_s: parseFloat(elapsed),
  }));

  await sql.end();
}

main().catch(async e => { process.stderr.write(`FATAL: ${e.message}\n`); await sql.end(); process.exit(1); });
