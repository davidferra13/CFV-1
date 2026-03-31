// Verify the actual TS module works through Drizzle ORM.
// Run with: npx tsx scripts/verify-ts-module.ts
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const mod = require('../lib/pricing/universal-price-lookup')
const lookupPrice = mod.lookupPrice as (q: { ingredient: string; zipCode?: string }) => Promise<{
  matched: boolean
  ingredient_name: string
  ingredient_id: string | null
  match_method: string
  match_confidence: number
  price_cents: number | null
  price_per_unit_cents: number | null
  unit: string
  range: { min_cents: number; max_cents: number } | null
  confidence_score: number
  data_points: number
  last_updated: string | null
  location: {
    zip_requested: string | null
    stores_in_area: number
    nearest_store_miles: number | null
    scope: string
  }
  sources: string[]
}>

const tests = [
  { ingredient: 'chicken breast', zipCode: '07030' },
  { ingredient: 'salmon', zipCode: '90210' },
  { ingredient: 'milk', zipCode: '10001' },
  { ingredient: 'cilantro', zipCode: '33101' },
  { ingredient: 'olive oil', zipCode: '60601' },
  { ingredient: 'chicken breast', zipCode: '01830' },
]

async function main() {
  let allPassed = true
  for (const t of tests) {
    const r = await lookupPrice(t)
    const pass = r.matched && r.price_cents != null
    if (!pass) allPassed = false
    const price = r.price_cents ? '$' + (r.price_cents / 100).toFixed(2) : 'NULL'
    const nearest = r.location.nearest_store_miles
      ? r.location.nearest_store_miles.toFixed(1) + 'mi'
      : 'N/A'
    console.log(
      `${pass ? 'PASS' : 'FAIL'} | ${t.ingredient.padEnd(20)} ${t.zipCode} | ${price}/${r.unit} | conf=${r.confidence_score} | ${r.data_points}pts | ${r.location.scope} (${r.location.stores_in_area} stores, nearest ${nearest})`
    )
  }
  console.log(allPassed ? '\nALL PASSED (real TS module via Drizzle ORM)' : '\nSOME FAILED')
  process.exit(allPassed ? 0 : 1)
}
main()
