#!/usr/bin/env node
/**
 * PROOF AUDIT: What does the current system actually have?
 * No opinions, no projections. Just facts from the database.
 */
import postgres from 'postgres'

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres', {
  connection: { search_path: 'public,openclaw,extensions' }
})

async function main() {
  // 1. Food categories (via category_id - just show distribution)
  const cats = await sql`
    SELECT category_id, COUNT(*) as cnt
    FROM openclaw.products
    WHERE is_food = true
    GROUP BY category_id
    ORDER BY cnt DESC
    LIMIT 20
  `
  console.log('=== TOP 20 FOOD CATEGORY IDs ===')
  for (const c of cats) {
    console.log(`  ${c.cnt} products - category_id: ${c.category_id || '(none)'}`)
  }

  // 2. Priced food products
  const priced = await sql`
    SELECT COUNT(DISTINCT p.id) as priced
    FROM openclaw.products p
    JOIN openclaw.store_products sp ON sp.product_id = p.id
    WHERE p.is_food = true
  `
  console.log(`\nFood products with at least 1 price: ${priced[0].priced} out of 80,004`)

  // 3. Chains with stores but zero products
  const empty = await sql`
    SELECT c.name, COUNT(s.id) as store_count,
      MIN(s.city) as sample_city, MIN(s.state) as sample_state
    FROM openclaw.chains c
    JOIN openclaw.stores s ON s.chain_id = c.id
    WHERE c.name IN ('Walmart','Whole Foods','Shaw''s','Target','Trader Joe''s','Costco')
    GROUP BY c.name
  `
  console.log('\n=== CHAINS WITH STORES BUT ZERO PRODUCTS ===')
  for (const e of empty) {
    console.log(`  ${e.name}: ${e.store_count} stores (e.g. ${e.sample_city}, ${e.sample_state}) - 0 products`)
  }

  // 4. 20 common ingredients - do we have prices?
  const testIngredients = [
    'butter', 'eggs', 'flour', 'sugar', 'rice',
    'onion', 'garlic', 'tomato', 'potato', 'carrot',
    'beef', 'pork', 'shrimp', 'salmon', 'bacon',
    'cheese', 'cream', 'yogurt', 'bread', 'pasta'
  ]

  console.log('\n=== 20 COMMON INGREDIENTS: STORE DATA ===')
  let found = 0
  let notFound = 0
  for (const ing of testIngredients) {
    const result = await sql`
      SELECT COUNT(*) as cnt,
        MIN(sp.price_cents) as min_price,
        MAX(sp.price_cents) as max_price,
        AVG(sp.price_cents)::int as avg_price
      FROM openclaw.products p
      JOIN openclaw.store_products sp ON sp.product_id = p.id
      WHERE p.is_food = true
        AND to_tsvector('english', p.name) @@ plainto_tsquery('english', ${ing})
    `
    const r = result[0]
    if (Number(r.cnt) > 0) {
      found++
      console.log(`  YES  ${ing}: ${r.cnt} products, $${(r.min_price/100).toFixed(2)} - $${(r.max_price/100).toFixed(2)} (avg $${(r.avg_price/100).toFixed(2)})`)
    } else {
      notFound++
      console.log(`  NO   ${ing}: zero store products`)
    }
  }
  console.log(`\n  Score: ${found}/${testIngredients.length} common ingredients have store price data`)

  // 5. Now test USDA fallback for the ones that missed
  console.log('\n=== USDA BASELINE FALLBACK (for ALL 20 ingredients) ===')
  let usdaFound = 0
  for (const ing of testIngredients) {
    // FTS first
    let result = await sql`
      SELECT item_name, price_cents, unit, region
      FROM openclaw.usda_price_baselines
      WHERE to_tsvector('english', item_name) @@ plainto_tsquery('english', ${ing})
        AND region = 'northeast'
      ORDER BY ts_rank(to_tsvector('english', item_name), plainto_tsquery('english', ${ing})) DESC
      LIMIT 1
    `
    if (result.length === 0) {
      // Trigram fallback
      result = await sql`
        SELECT item_name, price_cents, unit, region,
          similarity(item_name, ${ing}) as sim
        FROM openclaw.usda_price_baselines
        WHERE region = 'northeast'
          AND similarity(item_name, ${ing}) > 0.15
        ORDER BY sim DESC
        LIMIT 1
      `
    }
    if (result.length > 0) {
      usdaFound++
      const r = result[0]
      console.log(`  YES  ${ing} -> "${r.item_name}" $${(r.price_cents/100).toFixed(2)}/${r.unit} (${r.region})`)
    } else {
      console.log(`  NO   ${ing}: no USDA baseline match`)
    }
  }
  console.log(`\n  Score: ${usdaFound}/${testIngredients.length} have USDA baseline fallback`)

  // 6. Combined coverage: store data OR USDA
  console.log('\n=== COMBINED: STORE + USDA COVERAGE ===')
  const extendedIngredients = [
    // Common staples
    'butter', 'eggs', 'flour', 'sugar', 'rice', 'salt', 'pepper',
    'onion', 'garlic', 'tomato', 'potato', 'carrot', 'celery', 'lettuce',
    // Proteins
    'beef', 'pork', 'chicken', 'shrimp', 'salmon', 'bacon', 'turkey', 'lamb',
    // Dairy
    'cheese', 'cream', 'yogurt', 'milk', 'sour cream',
    // Baking/pantry
    'bread', 'pasta', 'olive oil', 'vinegar', 'honey', 'maple syrup',
    // Produce
    'avocado', 'lemon', 'lime', 'cucumber', 'bell pepper', 'mushroom',
    'spinach', 'broccoli', 'corn', 'green beans', 'asparagus',
    // Herbs/spices
    'basil', 'cilantro', 'parsley', 'thyme', 'rosemary',
    // Specialty
    'truffle oil', 'saffron', 'capers', 'anchovies', 'miso paste'
  ]

  let storeHits = 0
  let usdaHits = 0
  let totalMiss = 0
  const misses = []

  for (const ing of extendedIngredients) {
    // Check store data
    const storeResult = await sql`
      SELECT COUNT(*) as cnt
      FROM openclaw.products p
      JOIN openclaw.store_products sp ON sp.product_id = p.id
      WHERE p.is_food = true
        AND to_tsvector('english', p.name) @@ plainto_tsquery('english', ${ing})
    `
    if (Number(storeResult[0].cnt) > 0) {
      storeHits++
      continue
    }

    // Check USDA
    let usdaResult = await sql`
      SELECT item_name FROM openclaw.usda_price_baselines
      WHERE to_tsvector('english', item_name) @@ plainto_tsquery('english', ${ing})
        AND region = 'us_average'
      LIMIT 1
    `
    if (usdaResult.length === 0) {
      usdaResult = await sql`
        SELECT item_name FROM openclaw.usda_price_baselines
        WHERE region = 'us_average' AND similarity(item_name, ${ing}) > 0.15
        ORDER BY similarity(item_name, ${ing}) DESC
        LIMIT 1
      `
    }
    if (usdaResult.length > 0) {
      usdaHits++
      continue
    }

    totalMiss++
    misses.push(ing)
  }

  console.log(`  Store data covers: ${storeHits}/${extendedIngredients.length}`)
  console.log(`  USDA fills gaps:   ${usdaHits}/${extendedIngredients.length}`)
  console.log(`  Total covered:     ${storeHits + usdaHits}/${extendedIngredients.length} (${((storeHits + usdaHits)/extendedIngredients.length*100).toFixed(1)}%)`)
  console.log(`  No data at all:    ${totalMiss}`)
  if (misses.length > 0) {
    console.log(`  Missing: ${misses.join(', ')}`)
  }

  // 7. Data freshness detail
  const oldest = await sql`
    SELECT MIN(last_seen_at)::date as oldest, MAX(last_seen_at)::date as newest
    FROM openclaw.store_products
  `
  console.log(`\n=== DATA FRESHNESS ===`)
  console.log(`  Oldest price: ${oldest[0].oldest}`)
  console.log(`  Newest price: ${oldest[0].newest}`)

  // 8. How many unique stores actually have prices?
  const activeStores = await sql`
    SELECT s.city, s.state, c.name as chain, COUNT(sp.id) as price_count
    FROM openclaw.stores s
    JOIN openclaw.chains c ON c.id = s.chain_id
    JOIN openclaw.store_products sp ON sp.store_id = s.id
    GROUP BY s.city, s.state, c.name
    ORDER BY price_count DESC
    LIMIT 15
  `
  console.log('\n=== TOP 15 STORES BY PRICE COUNT ===')
  for (const s of activeStores) {
    console.log(`  ${s.chain} (${s.city}, ${s.state}): ${s.price_count} prices`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('PROOF AUDIT COMPLETE')
  console.log('='.repeat(60))

  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
