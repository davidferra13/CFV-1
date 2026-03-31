/**
 * Full pipeline audit: compare current state against projected targets.
 */
import postgres from 'postgres'

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres')

async function q(query) {
  try { return await query } catch(e) { return null }
}

async function main() {
  console.log('=== PIPELINE AUDIT vs TARGETS ===\n')

  // ── Products ────────────────────────────────────────────────────────────
  const products = await q(sql`SELECT COUNT(*) as cnt FROM openclaw.products`)
  const target_products = 600000
  console.log(`PRODUCTS: ${products?.[0].cnt ?? 0} / ${target_products} target (${((products?.[0].cnt ?? 0) / target_products * 100).toFixed(1)}%)`)

  // Products by category
  const byCat = await q(sql`
    SELECT pc.name as category, COUNT(*) as cnt
    FROM openclaw.products p
    LEFT JOIN openclaw.product_categories pc ON pc.id = p.category_id
    GROUP BY pc.name
    ORDER BY cnt DESC
    LIMIT 20
  `)
  if (byCat) {
    console.log('\nProduct categories:')
    byCat.forEach(r => console.log(`  ${r.category || 'uncategorized'}: ${r.cnt}`))
  }

  // ── Ingredients ─────────────────────────────────────────────────────────
  const sysIngs = await q(sql`SELECT COUNT(*) as cnt FROM system_ingredients`)
  console.log(`\nSYSTEM INGREDIENTS: ${sysIngs?.[0].cnt ?? 0} / 20,000 target`)

  const chefIngs = await q(sql`SELECT COUNT(*) as cnt FROM ingredients`)
  const chefPriced = await q(sql`SELECT COUNT(*) as cnt FROM ingredients WHERE last_price_cents IS NOT NULL`)
  console.log(`CHEF INGREDIENTS: ${chefIngs?.[0].cnt ?? 0} (${chefPriced?.[0].cnt ?? 0} priced)`)

  // ── Mapping Coverage ────────────────────────────────────────────────────
  const aliases = await q(sql`SELECT COUNT(*) as cnt FROM ingredient_aliases`)
  const coverage = chefIngs?.[0].cnt > 0 ? ((aliases?.[0].cnt ?? 0) / chefIngs[0].cnt * 100) : 0
  console.log(`\nMAPPING COVERAGE: ${coverage.toFixed(1)}% (target: 100%)`)
  console.log(`  Aliases: ${aliases?.[0].cnt ?? 0} / ${chefIngs?.[0].cnt ?? 0}`)

  const normMap = await q(sql`SELECT COUNT(*) as cnt FROM openclaw.normalization_map`)
  console.log(`  Normalization mappings: ${normMap?.[0].cnt ?? 0}`)

  // ── Null Results ────────────────────────────────────────────────────────
  const nullPrice = await q(sql`SELECT COUNT(*) as cnt FROM ingredients WHERE last_price_cents IS NULL`)
  const nullPct = chefIngs?.[0].cnt > 0 ? ((nullPrice?.[0].cnt ?? 0) / chefIngs[0].cnt * 100) : 0
  console.log(`\nNULL RESULTS: ${nullPct.toFixed(1)}% (target: 0%)`)

  // ── Stores ──────────────────────────────────────────────────────────────
  const stores = await q(sql`SELECT COUNT(*) as cnt FROM openclaw.stores`)
  const storesByState = await q(sql`
    SELECT state, COUNT(*) as cnt FROM openclaw.stores
    GROUP BY state ORDER BY cnt DESC LIMIT 10
  `)
  console.log(`\nSTORES: ${stores?.[0].cnt ?? 0}`)
  if (storesByState) {
    storesByState.forEach(r => console.log(`  ${r.state}: ${r.cnt}`))
  }

  const distinctZips = await q(sql`SELECT COUNT(DISTINCT zip) as cnt FROM openclaw.stores WHERE zip IS NOT NULL`)
  console.log(`Active zip codes: ${distinctZips?.[0].cnt ?? 0} / 5,000 target`)

  // ── Prices ──────────────────────────────────────────────────────────────
  const storePrices = await q(sql`SELECT COUNT(*) as cnt FROM openclaw.store_products`)
  console.log(`\nSTORE PRICES: ${storePrices?.[0].cnt ?? 0}`)

  const priceHistory = await q(sql`SELECT COUNT(*) as cnt FROM ingredient_price_history`)
  console.log(`PRICE HISTORY: ${priceHistory?.[0].cnt ?? 0}`)

  const bySrc = await q(sql`
    SELECT source, COUNT(*) as cnt FROM ingredient_price_history
    GROUP BY source ORDER BY cnt DESC
  `)
  if (bySrc) {
    console.log('By source:')
    bySrc.forEach(r => console.log(`  ${r.source}: ${r.cnt}`))
  }

  // Avg data points per ingredient
  const avgDP = await q(sql`
    SELECT
      ROUND(AVG(cnt)) as avg_dp,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cnt) as median_dp,
      MIN(cnt) as min_dp,
      MAX(cnt) as max_dp
    FROM (
      SELECT ingredient_id, COUNT(*) as cnt
      FROM ingredient_price_history
      GROUP BY ingredient_id
    ) sub
  `)
  if (avgDP?.[0]) {
    console.log(`\nData points per ingredient:`)
    console.log(`  Avg: ${avgDP[0].avg_dp} (target: 200)`)
    console.log(`  Median: ${avgDP[0].median_dp} (target: 50)`)
    console.log(`  Min: ${avgDP[0].min_dp}, Max: ${avgDP[0].max_dp}`)
  }

  // ── Data Freshness ──────────────────────────────────────────────────────
  const fresh = await q(sql`
    SELECT
      COUNT(*) FILTER (WHERE purchase_date >= CURRENT_DATE - INTERVAL '1 day') as last_24h,
      COUNT(*) FILTER (WHERE purchase_date >= CURRENT_DATE - INTERVAL '7 days') as last_7d,
      COUNT(*) FILTER (WHERE purchase_date < CURRENT_DATE - INTERVAL '30 days') as stale_30d,
      COUNT(*) as total
    FROM ingredient_price_history
  `)
  if (fresh?.[0] && fresh[0].total > 0) {
    const t = fresh[0]
    console.log(`\nDATA FRESHNESS:`)
    console.log(`  Last 24h: ${(t.last_24h / t.total * 100).toFixed(1)}% (target: >=20%)`)
    console.log(`  Last 7d:  ${(t.last_7d / t.total * 100).toFixed(1)}% (target: >=60%)`)
    console.log(`  Stale 30d+: ${(t.stale_30d / t.total * 100).toFixed(1)}% (target: <=20%)`)
  }

  // ── Materialized Views ──────────────────────────────────────────────────
  const rpa = await q(sql`SELECT COUNT(*) as cnt FROM regional_price_averages`)
  const cpb = await q(sql`SELECT COUNT(*) as cnt FROM category_price_baselines`)
  console.log(`\nMATERIALIZED VIEWS:`)
  console.log(`  Regional averages: ${rpa?.[0].cnt ?? 0}`)
  console.log(`  Category baselines: ${cpb?.[0].cnt ?? 0}`)

  // ── Bridge View ─────────────────────────────────────────────────────────
  const bridge = await q(sql`SELECT COUNT(*) as cnt FROM openclaw.ingredient_price_bridge`)
  console.log(`\nBRIDGE VIEW (ingredient -> product -> store price): ${bridge?.[0].cnt ?? 0} rows`)

  // ── Pi Status ───────────────────────────────────────────────────────────
  try {
    const res = await fetch('http://10.0.0.177:8081/api/stats', { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    console.log(`\nPI STATUS:`)
    console.log(`  Canonical ingredients: ${data.canonicalIngredients}`)
    console.log(`  Current prices: ${data.currentPrices}`)
    console.log(`  Sources: ${data.sources}`)
    console.log(`  Last scrape: ${data.lastScrapeAt}`)
  } catch(e) {
    console.log('\nPI: unreachable')
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n=== GAP ANALYSIS ===')
  console.log(`Products:          ${products?.[0].cnt ?? 0} / 600,000 (${((products?.[0].cnt ?? 0) / 600000 * 100).toFixed(1)}%) - SCRAPING SIDE`)
  console.log(`System ingredients: ${sysIngs?.[0].cnt ?? 0} / 20,000 (${((sysIngs?.[0].cnt ?? 0) / 20000 * 100).toFixed(1)}%)`)
  console.log(`Mapping coverage:  ${coverage.toFixed(1)}% / 100% ${coverage >= 100 ? 'PASS' : 'FAIL'}`)
  console.log(`Null results:      ${nullPct.toFixed(1)}% / 0% ${nullPct === 0 ? 'PASS' : 'FAIL'}`)
  console.log(`Pipeline:          product -> ingredient -> price: ${bridge?.[0].cnt > 0 ? 'CONNECTED' : 'BROKEN'}`)

  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
