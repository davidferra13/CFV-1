/**
 * Manual OpenClaw sync script.
 * Pulls prices from Pi and writes to local PostgreSQL.
 */
import postgres from 'postgres'

const PI_URL = 'http://10.0.0.177:8081'
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const sql = postgres(DB_URL)

function tierToSource(tier) {
  if (tier === 'flyer_scrape') return 'openclaw_flyer'
  if (tier === 'direct_scrape') return 'openclaw_scrape'
  if (tier.includes('instacart')) return 'openclaw_instacart'
  if (tier === 'government_baseline') return 'openclaw_government'
  return 'openclaw_flyer'
}

function tierToConfidence(tier) {
  if (tier === 'exact_receipt') return 0.95
  if (tier === 'direct_scrape') return 0.85
  if (tier.includes('flyer')) return 0.7
  if (tier.includes('instacart')) return 0.6
  if (tier === 'government_baseline') return 0.4
  return 0.5
}

async function main() {
  // 1. Load all ingredients
  const rows = await sql`
    SELECT id, name, tenant_id
    FROM ingredients
    WHERE tenant_id = '44f7d10c-a683-4a26-94c4-def97758a502'
  `
  console.log(`Ingredients in DB: ${rows.length}`)

  // 2. Deduplicate names
  const names = [...new Set(rows.map(r => r.name.trim()))]
  console.log(`Unique names to look up: ${names.length}`)

  // 3. Call Pi enriched endpoint
  const res = await fetch(`${PI_URL}/api/prices/enriched`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: names }),
  })
  const data = await res.json()

  let matched = 0
  let notFound = 0
  let priceRows = 0
  const notFoundNames = []
  const today = new Date().toISOString().split('T')[0]

  // 4. Process each result
  for (const [name, result] of Object.entries(data.results)) {
    const tenantIngs = rows.filter(r => r.name.trim() === name)

    if (!result || !result.best_price) {
      notFound += tenantIngs.length
      notFoundNames.push(name)
      continue
    }
    matched += tenantIngs.length

    for (const ing of tenantIngs) {
      // 4a. Write ALL store prices to ingredient_price_history
      for (const sp of result.all_prices) {
        const source = tierToSource(sp.tier)
        try {
          await sql`
            INSERT INTO ingredient_price_history
              (id, ingredient_id, tenant_id, price_cents, price_per_unit_cents,
               quantity, unit, purchase_date, store_name, source, notes)
            VALUES (
              gen_random_uuid(), ${ing.id}, ${ing.tenant_id},
              ${sp.normalized_cents}, ${sp.normalized_cents},
              1, ${sp.normalized_unit}, ${today},
              ${sp.store}, ${source},
              ${'Synced from OpenClaw - ' + sp.store}
            )
            ON CONFLICT (ingredient_id, tenant_id, source, store_name, purchase_date)
              WHERE source LIKE 'openclaw_%'
            DO UPDATE SET
              price_cents = EXCLUDED.price_cents,
              price_per_unit_cents = EXCLUDED.price_per_unit_cents,
              unit = EXCLUDED.unit,
              notes = EXCLUDED.notes
          `
          priceRows++
        } catch (err) {
          console.warn(`  Skip: ${ing.name} @ ${sp.store}: ${err.message?.substring(0, 80)}`)
        }
      }

      // 4b. Update ingredient row with best price
      const bp = result.best_price
      const conf = tierToConfidence(bp.tier)
      const src = tierToSource(bp.tier)

      try {
        await sql`
          UPDATE ingredients SET
            last_price_cents = ${bp.normalized_cents},
            last_price_date = ${today},
            price_unit = ${bp.normalized_unit},
            last_price_source = ${src},
            last_price_store = ${bp.store},
            last_price_confidence = ${conf},
            price_trend_direction = ${result.trend?.direction ?? null},
            price_trend_pct = ${result.trend?.change_7d_pct ?? null}
          WHERE id = ${ing.id}
        `
      } catch (err) {
        // Fallback if enrichment columns don't exist
        await sql`
          UPDATE ingredients SET
            last_price_cents = ${bp.normalized_cents},
            last_price_date = ${today},
            price_unit = ${bp.normalized_unit}
          WHERE id = ${ing.id}
        `
      }
    }
  }

  console.log('\n--- Sync Results ---')
  console.log(`Matched:       ${matched}`)
  console.log(`Not found:     ${notFound}`)
  console.log(`Price rows:    ${priceRows}`)
  if (notFoundNames.length > 0) {
    console.log(`Not found:     ${notFoundNames.join(', ')}`)
  }

  // 5. Quick verification
  const priceCount = await sql`SELECT COUNT(*) as cnt FROM ingredient_price_history`
  const pricedIngs = await sql`
    SELECT COUNT(*) as cnt FROM ingredients
    WHERE last_price_cents IS NOT NULL
    AND tenant_id = '44f7d10c-a683-4a26-94c4-def97758a502'
  `
  console.log(`\n--- Verification ---`)
  console.log(`ingredient_price_history rows: ${priceCount[0].cnt}`)
  console.log(`Ingredients with prices:       ${pricedIngs[0].cnt} / ${rows.length}`)

  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
