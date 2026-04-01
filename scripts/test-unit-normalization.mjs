/**
 * Diagnose unit normalization for items showing "each" that should show per-unit.
 * Check what size data exists in openclaw.products for these items.
 */
import postgres from 'postgres'
const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres')

async function checkProducts(searchText) {
  console.log(`\n--- Products matching "${searchText}" ---`)
  const rows = await sql`
    SELECT p.name, p.brand, p.size, p.size_value, p.size_unit,
      sp.price_cents, sp.sale_price_cents, s.name as store_name
    FROM openclaw.products p
    JOIN openclaw.store_products sp ON sp.product_id = p.id
    JOIN openclaw.stores s ON s.id = sp.store_id
    WHERE to_tsvector('english', p.name) @@ plainto_tsquery('english', ${searchText})
      AND sp.price_cents > 0
    ORDER BY sp.price_cents ASC
    LIMIT 20
  `
  for (const r of rows) {
    const sizeInfo = r.size_value ? `${r.size_value} ${r.size_unit}` : r.size || 'NO SIZE DATA'
    const price = r.sale_price_cents || r.price_cents
    let normalized = `$${(price / 100).toFixed(2)}/each`
    if (r.size_value && r.size_unit) {
      const unitLower = r.size_unit.toLowerCase()
      const GRAMS = { oz: 28.3495, lb: 453.592, 'fl oz': 29.5735, gallon: 3785.41, quart: 946.353, pint: 473.176, liter: 1000, ml: 1 }
      const g = GRAMS[unitLower]
      if (g) {
        const totalG = r.size_value * g
        const perLb = Math.round((price / totalG) * 453.592)
        normalized = `$${(perLb / 100).toFixed(2)}/lb`
      }
    }
    console.log(`  ${r.store_name.substring(0, 30).padEnd(30)} $${(price / 100).toFixed(2).padStart(6)} | size: ${sizeInfo.padEnd(15)} | normalized: ${normalized} | ${r.name.substring(0, 50)}`)
  }
}

async function main() {
  await checkProducts('milk whole')
  await checkProducts('olive oil')
  await checkProducts('cilantro')
  await checkProducts('chicken breast boneless')
  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
