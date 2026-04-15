#!/usr/bin/env node
/**
 * Price probe: verifies the full ingredient → price pipeline is working.
 * Run after sync-all.mjs to confirm prices are flowing through.
 *
 * Usage: node scripts/openclaw-pull/price-probe.mjs
 */
import postgres from 'postgres'
import config from './config.mjs'

const sql = postgres(config.pg.connectionString)

const PROBE_INGREDIENTS = [
  'chicken breast',
  'olive oil',
  'butter',
  'salmon',
  'garlic',
  'yellow onion',
  'tomato',
  'eggs',
  'broccoli',
  'potatoes',
  'shrimp',
  'beef',
  'pork',
  'milk',
  'heavy cream',
]

const MAX_PRICE_AGE_DAYS = 14 // prices older than this are stale

async function probe() {
  console.log('=== OpenClaw Price Probe ===')
  console.log(`Checking ${PROBE_INGREDIENTS.length} key ingredients...\n`)

  let passed = 0
  let stale = 0
  let missing = 0

  for (const name of PROBE_INGREDIENTS) {
    // Fuzzy match: ingredient name contains search term (case-insensitive)
    const rows = await sql`
      SELECT id, name, last_price_cents, price_unit, last_price_store, last_price_date
      FROM ingredients
      WHERE LOWER(name) LIKE ${'%' + name.toLowerCase() + '%'}
        AND last_price_cents IS NOT NULL
      ORDER BY last_price_cents ASC
      LIMIT 1
    `

    if (rows.length === 0) {
      console.log(`  MISS  ${name.padEnd(20)} - no priced ingredient found`)
      missing++
      continue
    }

    const ing = rows[0]
    const priceDate = ing.last_price_date ? new Date(ing.last_price_date) : null
    const ageMs = priceDate ? Date.now() - priceDate.getTime() : Infinity
    const ageDays = ageMs / (1000 * 60 * 60 * 24)

    // Count history rows
    const hist = await sql`
      SELECT COUNT(*) AS n FROM ingredient_price_history WHERE ingredient_id = ${ing.id}
    `

    const priceStr = `$${(ing.last_price_cents / 100).toFixed(2)}/${ing.price_unit || '?'}`
    const storeStr = (ing.last_price_store || 'unknown').substring(0, 28)
    const ageStr = priceDate ? `${Math.round(ageDays)}d ago` : 'no date'

    if (ageDays > MAX_PRICE_AGE_DAYS) {
      console.log(`  STALE ${name.padEnd(20)} ${priceStr.padEnd(14)} ${storeStr.padEnd(30)} ${ageStr} (${hist[0].n} history rows)`)
      stale++
    } else {
      console.log(`  OK    ${name.padEnd(20)} ${priceStr.padEnd(14)} ${storeStr.padEnd(30)} ${ageStr} (${hist[0].n} history rows)`)
      passed++
    }
  }

  // Summary
  console.log(`\n--- Summary ---`)
  console.log(`Passed:  ${passed}/${PROBE_INGREDIENTS.length}`)
  console.log(`Stale:   ${stale}/${PROBE_INGREDIENTS.length}  (prices > ${MAX_PRICE_AGE_DAYS} days old)`)
  console.log(`Missing: ${missing}/${PROBE_INGREDIENTS.length}`)

  // Overall ingredient coverage
  const total = await sql`SELECT COUNT(*) AS n FROM ingredients`
  const priced = await sql`SELECT COUNT(*) AS n FROM ingredients WHERE last_price_cents IS NOT NULL`
  const histTotal = await sql`SELECT COUNT(*) AS n FROM ingredient_price_history`
  const quarantined = await sql`SELECT COUNT(*) AS n FROM openclaw.quarantined_prices WHERE NOT reviewed`
  const piHealth = await fetch(`http://${config.pi.host}:${config.pi.port}/health`).then(r => r.json()).catch(() => null)

  console.log(`\n--- System State ---`)
  console.log(`Ingredients with prices:  ${priced[0].n} / ${total[0].n} (${Math.round(priced[0].n / total[0].n * 100)}%)`)
  console.log(`ingredient_price_history: ${Number(histTotal[0].n).toLocaleString()} rows`)
  console.log(`Quarantined (unreviewed): ${Number(quarantined[0].n).toLocaleString()}`)
  console.log(`Pi API status:            ${piHealth?.status || 'unreachable'}`)
  if (piHealth) {
    console.log(`Pi last scrape:           ${piHealth.timestamp || 'unknown'}`)
  }

  await sql.end()

  if (missing > 5 || stale > 8) {
    console.log('\nWARNING: price coverage is degraded. Run sync-all.mjs to refresh.')
    process.exit(1)
  }
  console.log('\nProbe PASSED.')
}

probe().catch(err => {
  console.error('Probe error:', err.message)
  process.exit(1)
})
