// @ts-nocheck
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import pg from 'postgres'
import fs from 'fs'

const url = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_DB_URL
const sql = pg(url)

const migrations = [
  'database/migrations/20260503000009_pricing_regions.sql',
  'database/migrations/20260503000010_pricing_feedback_loop.sql',
  'database/migrations/20260503000011_pricing_supplier_health.sql',
  'database/migrations/20260503000012_margin_snapshots.sql',
  'database/migrations/20260503000013_pie_census_and_fallback.sql',
  'database/migrations/20260503000014_compound_learning.sql',
]

async function main() {
  for (const file of migrations) {
    try {
      const content = fs.readFileSync(file, 'utf8')
      await sql.unsafe(content)
      console.log(`OK: ${file}`)
    } catch (e) {
      console.log(`WARN: ${file} - ${e.message?.slice(0, 100)}`)
    }
  }
  await sql.end()
  console.log('\nPIE migrations complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
