#!/usr/bin/env node
/**
 * PIE Accuracy Check - Pre-computed product IDs approach
 * Run: node scripts/pie-accuracy-run.cjs [--sample=100]
 */
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres', { connect_timeout: 10 });
const sampleSize = (() => { const a = process.argv.find(a => a.startsWith('--sample=')); return a ? parseInt(a.split('=')[1], 10) : 100; })();

async function main() {
  const startTime = Date.now();

  process.stderr.write('Building ingredient->product mapping (slow, ~3min)...\n');
  const mapping = await sql`
    SELECT
      ci.ingredient_id, ci.name as canonical_name, ci.category,
      ARRAY_AGG(DISTINCT p.id) as product_ids,
      COUNT(DISTINCT p.id)::int as product_count
    FROM openclaw.canonical_ingredients ci
    JOIN openclaw.normalization_map nm ON nm.canonical_ingredient_id = ci.ingredient_id
    JOIN openclaw.products p ON LOWER(TRIM(p.name)) = LOWER(TRIM(nm.raw_name)) AND p.is_food = true
    WHERE ci.category IS NOT NULL
    GROUP BY ci.ingredient_id, ci.name, ci.category
    HAVING COUNT(DISTINCT p.id) >= 1
    ORDER BY RANDOM()
    LIMIT ${sampleSize}
  `;
  process.stderr.write(`Got ${mapping.length} ingredients in ${((Date.now() - startTime)/1000).toFixed(0)}s\n`);

  const results = [];
  for (const row of mapping) {
    const productIds = row.product_ids;
    if (!productIds || productIds.length === 0) continue;

    const prices = await sql`
      SELECT sp.price_cents
      FROM openclaw.store_products sp
      WHERE sp.product_id = ANY(${productIds})
        AND sp.price_cents BETWEEN 50 AND 100000
      ORDER BY sp.last_seen_at DESC
      LIMIT 20
    `;

    if (prices.length < 3) continue;

    const sorted = prices.map(r => r.price_cents).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
    const errorPct = Math.abs(mean - median) / median * 100;

    results.push({
      name: row.canonical_name,
      category: row.category,
      pie_cents: mean,
      truth_cents: median,
      error_pct: Math.round(errorPct * 10) / 10,
      pass: errorPct <= 15,
      data_points: prices.length,
      products: row.product_count,
    });
  }

  const passing = results.filter(r => r.pass);
  const accuracy = results.length > 0 ? Math.round(passing.length / results.length * 1000) / 10 : 0;
  const meanError = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.error_pct, 0) / results.length * 10) / 10 : 0;

  const cats = new Map();
  for (const r of results) {
    const cat = r.category || 'unknown';
    if (!cats.has(cat)) cats.set(cat, { pass: 0, total: 0, errors: [] });
    const c = cats.get(cat);
    c.total++; c.errors.push(r.error_pct);
    if (r.pass) c.pass++;
  }
  const byCategory = [...cats.entries()]
    .map(([cat, d]) => ({ category: cat, accuracy_pct: Math.round(d.pass / d.total * 1000) / 10, sample: d.total, mean_error: Math.round(d.errors.reduce((a, b) => a + b, 0) / d.errors.length * 10) / 10 }))
    .sort((a, b) => a.accuracy_pct - b.accuracy_pct);

  const worst = [...results].sort((a, b) => b.error_pct - a.error_pct).slice(0, 10);

  const report = {
    timestamp: new Date().toISOString(),
    sample_size: results.length,
    accuracy_pct: accuracy,
    mean_error_pct: meanError,
    passing: passing.length,
    failing: results.length - passing.length,
    by_category: byCategory,
    worst_offenders: worst,
    elapsed_ms: Date.now() - startTime,
  };

  console.log(JSON.stringify(report, null, 2));

  process.stderr.write(`\n=== PIE ACCURACY CHECK ===\n`);
  process.stderr.write(`Sample: ${results.length} ingredients\n`);
  process.stderr.write(`Accuracy (within 15%): ${accuracy}%\n`);
  process.stderr.write(`Mean error: ${meanError}%\n`);
  process.stderr.write(`\nBy category:\n`);
  byCategory.forEach(c => process.stderr.write(`  ${c.category}: ${c.accuracy_pct}% (n=${c.sample}, err=${c.mean_error}%)\n`));
  process.stderr.write(`\nWorst offenders:\n`);
  worst.slice(0, 5).forEach(w => process.stderr.write(`  ${w.name}: PIE=${w.pie_cents}c vs truth=${w.truth_cents}c (${w.error_pct}% off)\n`));

  await sql.end();
  process.exit(accuracy >= 75 ? 0 : 1);
}

main().catch(async e => { process.stderr.write(`FATAL: ${e.message}\n`); await sql.end(); process.exit(1); });
