#!/usr/bin/env node
/**
 * Real-world price engine validation.
 * Tests 8 ingredient+ZIP combos and reports actual system outputs.
 */
import postgres from 'postgres'

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres')

const TEST_CASES = [
  { ingredient: 'chicken breast', zip: '07030', label: 'Hoboken, NJ' },
  { ingredient: 'salmon', zip: '90210', label: 'Beverly Hills, CA' },
  { ingredient: 'milk', zip: '10001', label: 'Manhattan, NY' },
  { ingredient: 'cilantro', zip: '33101', label: 'Miami, FL' },
  { ingredient: 'olive oil', zip: '60601', label: 'Chicago, IL' },
  { ingredient: 'zucchini', zip: '73301', label: 'Austin, TX' },
  { ingredient: 'deli salami', zip: '94105', label: 'San Francisco, CA' },
  { ingredient: 'ice cream', zip: '02108', label: 'Boston, MA' },
]

// Also test a local ZIP to compare
const LOCAL_CASE = { ingredient: 'chicken breast', zip: '01830', label: 'Haverhill, MA (local)' }

async function testIngredient({ ingredient, zip, label }) {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`  ${ingredient.toUpperCase()} @ ${zip} (${label})`)
  console.log('='.repeat(70))

  // 1. Check if ZIP resolves to coordinates
  const zipStores = await sql`
    SELECT COUNT(*) as cnt FROM openclaw.stores
    WHERE zip = ${zip} AND lat IS NOT NULL
  `
  const hasLocalStores = Number(zipStores[0].cnt) > 0

  // 2. Ingredient matching - check system_ingredients
  const exactMatch = await sql`
    SELECT id, name, category FROM system_ingredients
    WHERE LOWER(name) = ${ingredient.toLowerCase()}
    LIMIT 1
  `
  const ftsMatch = await sql`
    SELECT id, name, category,
      ts_rank(to_tsvector('english', name), plainto_tsquery('english', ${ingredient})) as rank
    FROM system_ingredients
    WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${ingredient})
    ORDER BY rank DESC
    LIMIT 3
  `

  console.log(`  ZIP resolves: ${hasLocalStores ? 'YES' : 'NO (falls to national)'}`)
  console.log(`  Ingredient match:`)
  if (exactMatch.length > 0) {
    console.log(`    EXACT: "${exactMatch[0].name}" (${exactMatch[0].category})`)
  } else if (ftsMatch.length > 0) {
    for (const m of ftsMatch) {
      console.log(`    FTS: "${m.name}" (rank=${Number(m.rank).toFixed(4)}, cat=${m.category})`)
    }
  } else {
    console.log(`    NO MATCH in system_ingredients`)
  }

  // 3. Product search (food-only, simulating the fixed query)
  const products = await sql`
    SELECT p.name, sp.price_cents, p.size, p.size_value, p.size_unit,
           s.name as store_name, sp.last_seen_at
    FROM openclaw.products p
    JOIN openclaw.store_products sp ON sp.product_id = p.id
    JOIN openclaw.stores s ON s.id = sp.store_id
    WHERE to_tsvector('english', p.name) @@ plainto_tsquery('english', ${ingredient})
      AND sp.price_cents > 0
      AND sp.price_cents < 50000
      AND p.is_food = true
    ORDER BY ts_rank(to_tsvector('english', p.name), plainto_tsquery('english', ${ingredient})) DESC,
             sp.last_seen_at DESC
    LIMIT 15
  `

  console.log(`  Products found (food-only): ${products.length}`)
  if (products.length > 0) {
    // Show top 5
    for (const p of products.slice(0, 5)) {
      const price = (p.price_cents / 100).toFixed(2)
      const size = p.size_value && p.size_unit ? `${p.size_value} ${p.size_unit}` : (p.size || 'each')
      console.log(`    $${price} | ${p.name} | ${size} | ${p.store_name}`)
    }
    if (products.length > 5) console.log(`    ... and ${products.length - 5} more`)

    // Compute stats
    const prices = products.map(p => p.price_cents)
    const sorted = [...prices].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0 ? (sorted[mid-1] + sorted[mid]) / 2 : sorted[mid]

    console.log(`  Price stats:`)
    console.log(`    Median: $${(median/100).toFixed(2)}`)
    console.log(`    Range: $${(sorted[0]/100).toFixed(2)} - $${(sorted[sorted.length-1]/100).toFixed(2)}`)
    console.log(`    Data points: ${sorted.length}`)
    console.log(`    Last seen: ${products[0].last_seen_at}`)
  }

  // 4. Check for non-food products that WOULD have been included before fix
  const nonFoodHits = await sql`
    SELECT p.name, sp.price_cents
    FROM openclaw.products p
    JOIN openclaw.store_products sp ON sp.product_id = p.id
    WHERE to_tsvector('english', p.name) @@ plainto_tsquery('english', ${ingredient})
      AND p.is_food = false
      AND sp.price_cents > 0
    LIMIT 5
  `
  if (nonFoodHits.length > 0) {
    console.log(`  NON-FOOD filtered out (would have polluted results):`)
    for (const p of nonFoodHits) {
      console.log(`    $${(p.price_cents/100).toFixed(2)} | ${p.name}`)
    }
  }

  // 5. Confidence assessment
  const scope = hasLocalStores ? 'local' : 'national'
  const scopeMultiplier = scope === 'local' ? 1.0 : 0.35
  const matchConf = exactMatch.length > 0 ? 1.0 : ftsMatch.length > 0 ? 0.7 : 0.5
  const dataConf = Math.min(products.length, 20) / 20
  const overall = Math.round(matchConf * scopeMultiplier * dataConf * 100) / 100

  console.log(`  Confidence:`)
  console.log(`    Scope: ${scope} (multiplier: ${scopeMultiplier})`)
  console.log(`    Match: ${matchConf}`)
  console.log(`    Data: ${dataConf.toFixed(2)}`)
  console.log(`    Overall: ${overall}`)
  if (scope === 'national') {
    console.log(`    NOTE: No stores near ${zip}. Price from NE United States stores only.`)
  }
}

async function systemMetrics() {
  console.log('\n' + '='.repeat(70))
  console.log('  SYSTEM METRICS (POST-FIX)')
  console.log('='.repeat(70))

  const totalProducts = await sql`SELECT COUNT(*) as cnt FROM openclaw.products`
  const foodProducts = await sql`SELECT COUNT(*) as cnt FROM openclaw.products WHERE is_food = true`
  const nonFoodProducts = await sql`SELECT COUNT(*) as cnt FROM openclaw.products WHERE is_food = false`
  const withPrices = await sql`SELECT COUNT(DISTINCT product_id) as cnt FROM openclaw.store_products WHERE price_cents > 0`
  const storesWithData = await sql`SELECT COUNT(DISTINCT store_id) as cnt FROM openclaw.store_products`
  const totalStores = await sql`SELECT COUNT(*) as cnt FROM openclaw.stores`
  const normMap = await sql`SELECT COUNT(*) as cnt FROM openclaw.normalization_map`
  const sysIngredients = await sql`SELECT COUNT(*) as cnt FROM system_ingredients`
  const statesCovered = await sql`SELECT DISTINCT state FROM openclaw.stores WHERE state IS NOT NULL ORDER BY state`

  console.log(`  Total products:     ${totalProducts[0].cnt}`)
  console.log(`  Food products:      ${foodProducts[0].cnt} (${(foodProducts[0].cnt/totalProducts[0].cnt*100).toFixed(1)}%)`)
  console.log(`  Non-food filtered:  ${nonFoodProducts[0].cnt} (${(nonFoodProducts[0].cnt/totalProducts[0].cnt*100).toFixed(1)}%)`)
  console.log(`  Products with prices: ${withPrices[0].cnt}`)
  console.log(`  Stores with data:   ${storesWithData[0].cnt} / ${totalStores[0].cnt}`)
  console.log(`  System ingredients:  ${sysIngredients[0].cnt}`)
  console.log(`  Normalization map:   ${normMap[0].cnt} entries`)
  console.log(`  States covered:      ${statesCovered.map(r => r.state).join(', ')}`)

  // Check non-food categories
  const nonFoodCats = await sql`
    SELECT pc.name, COUNT(p.id) as cnt
    FROM openclaw.product_categories pc
    JOIN openclaw.products p ON p.category_id = pc.id
    WHERE pc.is_food = false
    GROUP BY pc.name ORDER BY cnt DESC
  `
  console.log(`\n  Non-food categories removed from price searches:`)
  for (const r of nonFoodCats) console.log(`    ${r.name}: ${r.cnt} products`)
}

async function main() {
  await systemMetrics()

  // Run local test first for comparison
  await testIngredient(LOCAL_CASE)

  // Run all 8 test cases
  for (const tc of TEST_CASES) {
    await testIngredient(tc)
  }

  console.log('\n' + '='.repeat(70))
  console.log('  VALIDATION COMPLETE')
  console.log('='.repeat(70))

  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
