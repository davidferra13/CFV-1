#!/usr/bin/env node
/**
 * Backfill Normalization Map
 *
 * The openclaw.normalization_map table bridges canonical_ingredients to
 * actual products so the catalog browser can show store prices.
 * 81% of canonical ingredients had no norm_map entry, making them
 * invisible to price lookups even though matching products exist.
 *
 * Strategy: exact name match (ci.name == p.name) with is_food=true filter.
 * This is deterministic, zero-AI, and safe to re-run (ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   node scripts/backfill-normalization-map.mjs [--dry-run]
 *
 * First run results (2026-04-10):
 *   - Inserted 70,978 rows in 59s
 *   - norm_map coverage: 19% -> 72% of canonical ingredients
 */

import postgres from 'postgres'

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres', {
  idle_timeout: 600,
  connect_timeout: 60,
})

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log('=== Normalization Map Backfill ===')
  if (DRY_RUN) console.log('[DRY RUN] No writes will occur.')
  console.log('')

  const before = await sql`SELECT COUNT(*) as cnt FROM openclaw.normalization_map`
  const unmapped = await sql`
    SELECT COUNT(*) as cnt
    FROM openclaw.canonical_ingredients ci
    LEFT JOIN openclaw.normalization_map nm ON nm.canonical_ingredient_id = ci.ingredient_id
    WHERE nm.canonical_ingredient_id IS NULL
  `

  console.log('norm_map rows before:', before[0].cnt)
  console.log('canonical ingredients without norm_map:', unmapped[0].cnt)
  console.log('')

  if (Number(unmapped[0].cnt) === 0) {
    console.log('Nothing to do - all canonical ingredients already mapped.')
    await sql.end()
    return
  }

  if (!DRY_RUN) {
    console.log('Inserting exact-match rows...')
    const t0 = Date.now()

    const result = await sql`
      INSERT INTO openclaw.normalization_map
        (raw_name, canonical_ingredient_id, method, confidence, confirmed)
      SELECT DISTINCT ON (LOWER(TRIM(ci.name)))
        ci.name,
        ci.ingredient_id,
        'exact',
        1.0,
        false
      FROM openclaw.canonical_ingredients ci
      JOIN openclaw.products p
        ON LOWER(TRIM(p.name)) = LOWER(TRIM(ci.name))
        AND p.is_food = true
      LEFT JOIN openclaw.normalization_map nm
        ON nm.canonical_ingredient_id = ci.ingredient_id
      WHERE nm.canonical_ingredient_id IS NULL
      ON CONFLICT (raw_name) DO NOTHING
    `

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(`Done in ${elapsed}s`)
    console.log(`Rows inserted: ${result.count}`)
    console.log('')
  } else {
    const preview = await sql`
      SELECT COUNT(DISTINCT LOWER(TRIM(ci.name))) as would_insert
      FROM openclaw.canonical_ingredients ci
      JOIN openclaw.products p
        ON LOWER(TRIM(p.name)) = LOWER(TRIM(ci.name))
        AND p.is_food = true
      LEFT JOIN openclaw.normalization_map nm
        ON nm.canonical_ingredient_id = ci.ingredient_id
      WHERE nm.canonical_ingredient_id IS NULL
    `
    console.log('[DRY RUN] Would insert:', preview[0].would_insert, 'rows')
  }

  const after = await sql`SELECT COUNT(*) as cnt FROM openclaw.normalization_map`
  const mapped = await sql`
    SELECT COUNT(DISTINCT ci.ingredient_id) as cnt
    FROM openclaw.canonical_ingredients ci
    JOIN openclaw.normalization_map nm ON nm.canonical_ingredient_id = ci.ingredient_id
  `
  const total = await sql`SELECT COUNT(*) as cnt FROM openclaw.canonical_ingredients`

  console.log('=== Results ===')
  console.log('norm_map rows after:             ', after[0].cnt)
  console.log('new rows added:                  ', Number(after[0].cnt) - Number(before[0].cnt))
  console.log('canonical ingredients mapped:    ', mapped[0].cnt, '/', total[0].cnt)
  console.log('coverage:                        ', Math.round(Number(mapped[0].cnt) / Number(total[0].cnt) * 100) + '%')

  await sql.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
