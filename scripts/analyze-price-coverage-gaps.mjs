#!/usr/bin/env node
/**
 * PIE Price Coverage Gap Analysis
 *
 * Identifies chains and store types with the most stores but zero/few prices.
 * Outputs a prioritized target list for scraping expansion.
 *
 * Usage: node scripts/analyze-price-coverage-gaps.mjs
 */

import pg from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = pg(DATABASE_URL, { max: 3, idle_timeout: 20, transform: pg.camel })

function divider(title) {
  console.log('\n' + '='.repeat(70))
  console.log(`  ${title}`)
  console.log('='.repeat(70))
}

function table(rows, columns) {
  if (!rows.length) {
    console.log('  (no data)')
    return
  }
  // Calculate column widths
  const widths = columns.map(col => Math.max(
    col.label.length,
    ...rows.map(r => String(r[col.key] ?? '').length)
  ))
  // Header
  const header = columns.map((col, i) => col.label.padEnd(widths[i])).join('  ')
  console.log(`  ${header}`)
  console.log(`  ${columns.map((_, i) => '-'.repeat(widths[i])).join('  ')}`)
  // Rows
  for (const row of rows) {
    const line = columns.map((col, i) => {
      const val = String(row[col.key] ?? '')
      return col.align === 'right' ? val.padStart(widths[i]) : val.padEnd(widths[i])
    }).join('  ')
    console.log(`  ${line}`)
  }
}

async function run() {
  console.log('PIE Price Coverage Gap Analysis')
  console.log(`Run: ${new Date().toISOString()}`)

  // -------------------------------------------------------------------------
  // 1. Summary stats
  // -------------------------------------------------------------------------
  divider('OVERALL COVERAGE SUMMARY')
  const [summary] = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM openclaw.stores WHERE is_active = true) AS total_stores,
      (SELECT COUNT(*)::int FROM openclaw.chains) AS total_chains,
      (SELECT COUNT(DISTINCT store_id)::int FROM openclaw.store_products) AS stores_with_prices,
      (SELECT COUNT(*)::bigint FROM openclaw.store_products) AS total_price_records
  `
  const storesNoPrices = summary.totalStores - summary.storesWithPrices
  const coveragePct = ((summary.storesWithPrices / summary.totalStores) * 100).toFixed(1)
  console.log(`  Total active stores:     ${summary.totalStores.toLocaleString()}`)
  console.log(`  Chains in database:      ${summary.totalChains.toLocaleString()}`)
  console.log(`  Stores WITH prices:      ${summary.storesWithPrices.toLocaleString()} (${coveragePct}%)`)
  console.log(`  Stores WITHOUT prices:   ${storesNoPrices.toLocaleString()} (${(100 - coveragePct).toFixed(1)}%)`)
  console.log(`  Total price records:     ${Number(summary.totalPriceRecords).toLocaleString()}`)

  // -------------------------------------------------------------------------
  // 2. Top chains by store count with zero prices
  // -------------------------------------------------------------------------
  divider('TOP 20 CHAINS BY STORE COUNT WITH ZERO PRICES')
  const zeroPriceChains = await sql`
    SELECT
      c.name AS chain_name,
      c.slug,
      COUNT(s.id)::int AS store_count,
      s.store_type AS primary_store_type,
      COUNT(DISTINCT s.state) AS states_present
    FROM openclaw.chains c
    JOIN openclaw.stores s ON s.chain_id = c.id AND s.is_active = true
    LEFT JOIN openclaw.store_products sp ON sp.store_id = s.id
    WHERE sp.id IS NULL
    GROUP BY c.id, c.name, c.slug, s.store_type
    ORDER BY store_count DESC
    LIMIT 20
  `
  table(zeroPriceChains, [
    { key: 'chainName', label: 'Chain', align: 'left' },
    { key: 'storeCount', label: 'Stores', align: 'right' },
    { key: 'primaryStoreType', label: 'Type', align: 'left' },
    { key: 'statesPresent', label: 'States', align: 'right' },
  ])

  // -------------------------------------------------------------------------
  // 3. Top chains with SOME stores having prices but most not (partial coverage)
  // -------------------------------------------------------------------------
  divider('TOP 15 CHAINS WITH PARTIAL COVERAGE (some prices, many gaps)')
  const partialChains = await sql`
    SELECT
      c.name AS chain_name,
      COUNT(s.id)::int AS total_stores,
      COUNT(DISTINCT sp.store_id)::int AS stores_with_prices,
      (COUNT(s.id) - COUNT(DISTINCT sp.store_id))::int AS stores_missing,
      ROUND(COUNT(DISTINCT sp.store_id)::numeric / NULLIF(COUNT(s.id), 0) * 100, 1) AS coverage_pct
    FROM openclaw.chains c
    JOIN openclaw.stores s ON s.chain_id = c.id AND s.is_active = true
    LEFT JOIN openclaw.store_products sp ON sp.store_id = s.id
    GROUP BY c.id, c.name
    HAVING COUNT(DISTINCT sp.store_id) > 0
       AND COUNT(DISTINCT sp.store_id) < COUNT(s.id) * 0.5
    ORDER BY (COUNT(s.id) - COUNT(DISTINCT sp.store_id)) DESC
    LIMIT 15
  `
  table(partialChains, [
    { key: 'chainName', label: 'Chain', align: 'left' },
    { key: 'totalStores', label: 'Total', align: 'right' },
    { key: 'storesWithPrices', label: 'Covered', align: 'right' },
    { key: 'storesMissing', label: 'Missing', align: 'right' },
    { key: 'coveragePct', label: 'Cov%', align: 'right' },
  ])

  // -------------------------------------------------------------------------
  // 4. Store type breakdown
  // -------------------------------------------------------------------------
  divider('STORE TYPE COVERAGE BREAKDOWN')
  const storeTypes = await sql`
    SELECT
      s.store_type,
      COUNT(s.id)::int AS total_stores,
      COUNT(DISTINCT sp.store_id)::int AS stores_with_prices,
      (COUNT(s.id) - COUNT(DISTINCT sp.store_id))::int AS stores_no_prices,
      ROUND(COUNT(DISTINCT sp.store_id)::numeric / NULLIF(COUNT(s.id), 0) * 100, 1) AS coverage_pct
    FROM openclaw.stores s
    LEFT JOIN openclaw.store_products sp ON sp.store_id = s.id
    WHERE s.is_active = true
    GROUP BY s.store_type
    ORDER BY stores_no_prices DESC
  `
  table(storeTypes, [
    { key: 'storeType', label: 'Store Type', align: 'left' },
    { key: 'totalStores', label: 'Total', align: 'right' },
    { key: 'storesWithPrices', label: 'Covered', align: 'right' },
    { key: 'storesNoPrices', label: 'No Prices', align: 'right' },
    { key: 'coveragePct', label: 'Cov%', align: 'right' },
  ])

  // -------------------------------------------------------------------------
  // 5. State-level gaps
  // -------------------------------------------------------------------------
  divider('STATE-LEVEL GAPS (most stores, least price data)')
  const stateGaps = await sql`
    SELECT
      s.state,
      COUNT(s.id)::int AS total_stores,
      COUNT(DISTINCT sp.store_id)::int AS stores_with_prices,
      (COUNT(s.id) - COUNT(DISTINCT sp.store_id))::int AS stores_no_prices,
      ROUND(COUNT(DISTINCT sp.store_id)::numeric / NULLIF(COUNT(s.id), 0) * 100, 1) AS coverage_pct
    FROM openclaw.stores s
    LEFT JOIN openclaw.store_products sp ON sp.store_id = s.id
    WHERE s.is_active = true AND s.state IS NOT NULL AND LENGTH(s.state) = 2
    GROUP BY s.state
    ORDER BY stores_no_prices DESC
    LIMIT 25
  `
  table(stateGaps, [
    { key: 'state', label: 'State', align: 'left' },
    { key: 'totalStores', label: 'Total', align: 'right' },
    { key: 'storesWithPrices', label: 'Covered', align: 'right' },
    { key: 'storesNoPrices', label: 'No Prices', align: 'right' },
    { key: 'coveragePct', label: 'Cov%', align: 'right' },
  ])

  // -------------------------------------------------------------------------
  // 6. Prioritized scraping targets (chef-relevant chains, most locations)
  // -------------------------------------------------------------------------
  divider('PRIORITIZED SCRAPING TARGETS (chef-relevant, highest impact)')
  console.log('  Scoring: store_count * relevance_weight (grocery/wholesale = 3x, specialty = 2x, convenience = 1x)\n')

  const targets = await sql`
    WITH chain_stats AS (
      SELECT
        c.id,
        c.name AS chain_name,
        c.slug,
        s.store_type,
        COUNT(s.id)::int AS store_count,
        COUNT(DISTINCT sp.store_id)::int AS covered,
        COUNT(DISTINCT s.state)::int AS states_present
      FROM openclaw.chains c
      JOIN openclaw.stores s ON s.chain_id = c.id AND s.is_active = true
      LEFT JOIN openclaw.store_products sp ON sp.store_id = s.id
      GROUP BY c.id, c.name, c.slug, s.store_type
      HAVING COUNT(DISTINCT sp.store_id) < COUNT(s.id) * 0.1
    )
    SELECT
      chain_name,
      store_type,
      store_count,
      covered,
      states_present,
      (store_count - covered) AS uncovered,
      CASE
        WHEN store_type IN ('supermarket', 'grocery', 'wholesale', 'warehouse_club') THEN 3
        WHEN store_type IN ('specialty', 'organic', 'farm', 'farmers_market', 'butcher', 'seafood', 'bakery', 'deli', 'cheese', 'spices') THEN 2
        WHEN store_type IN ('alcohol', 'wine', 'beer', 'liquor_store') THEN 2
        WHEN store_type IN ('frozen_food', 'ice_cream', 'dairy', 'honey', 'nuts') THEN 2
        ELSE 1
      END AS relevance_weight,
      (store_count - covered) * CASE
        WHEN store_type IN ('supermarket', 'grocery', 'wholesale', 'warehouse_club') THEN 3
        WHEN store_type IN ('specialty', 'organic', 'farm', 'farmers_market', 'butcher', 'seafood', 'bakery', 'deli', 'cheese', 'spices') THEN 2
        WHEN store_type IN ('alcohol', 'wine', 'beer', 'liquor_store') THEN 2
        WHEN store_type IN ('frozen_food', 'ice_cream', 'dairy', 'honey', 'nuts') THEN 2
        ELSE 1
      END AS priority_score
    FROM chain_stats
    WHERE store_count >= 5
    ORDER BY priority_score DESC
    LIMIT 30
  `
  table(targets, [
    { key: 'chainName', label: 'Chain', align: 'left' },
    { key: 'storeType', label: 'Type', align: 'left' },
    { key: 'storeCount', label: 'Stores', align: 'right' },
    { key: 'covered', label: 'Covered', align: 'right' },
    { key: 'uncovered', label: 'Gap', align: 'right' },
    { key: 'statesPresent', label: 'States', align: 'right' },
    { key: 'relevanceWeight', label: 'Wt', align: 'right' },
    { key: 'priorityScore', label: 'Score', align: 'right' },
  ])

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------
  divider('RECOMMENDATIONS')
  console.log('  1. Focus scrapers on top priority_score chains first')
  console.log('  2. Grocery/wholesale chains give most bang per scraper (3x weight)')
  console.log('  3. Specialty food stores (butcher, seafood, bakery) are high-value for chefs')
  console.log('  4. States with most uncovered stores indicate geographic expansion priority')
  console.log('  5. Chains with partial coverage may already have scraper templates to reuse\n')

  await sql.end()
  process.exit(0)
}

run().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
