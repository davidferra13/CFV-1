// @ts-nocheck
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import pg from 'postgres'

const url = process.env.DATABASE_URL || process.env.DB_URL
const sql = pg(url)

async function main() {
  const tables = [
    'openclaw.pricing_regions',
    'openclaw.canonical_ingredients',
    'openclaw.ingredient_census',
    'openclaw.resolved_prices',
    'openclaw.synthetic_prices',
    'openclaw.zip_centroids',
    'openclaw.system_ingredient_prices',
    'openclaw.freshness_policy',
  ]

  for (const t of tables) {
    try {
      const rows = await sql.unsafe(`SELECT count(*) as c FROM ${t}`)
      console.log(`${t}: ${rows[0].c}`)
    } catch (e) {
      console.log(`${t}: ERROR - ${e.message?.slice(0, 80)}`)
    }
  }

  // Check if openclaw schema exists
  try {
    const schemas =
      await sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'openclaw'`
    console.log(`\nopenclaw schema exists: ${schemas.length > 0}`)
  } catch (e) {
    console.log(`schema check error: ${e.message}`)
  }

  // All openclaw tables
  const allTables =
    await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='openclaw' ORDER BY table_name`
  console.log('\nAll openclaw tables:', allTables.map((r) => r.table_name).join(', '))

  // Column types
  const ci =
    await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='openclaw' AND table_name='canonical_ingredients' ORDER BY ordinal_position LIMIT 10`
  console.log(
    '\ncanonical_ingredients:',
    ci.map((r) => r.column_name + ':' + r.data_type).join(', ')
  )

  const sip =
    await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='openclaw' AND table_name='system_ingredient_prices' ORDER BY ordinal_position LIMIT 15`
  console.log(
    'system_ingredient_prices:',
    sip.map((r) => r.column_name + ':' + r.data_type).join(', ')
  )

  // Sample data
  const sample =
    await sql`SELECT ingredient_id, name, category FROM openclaw.canonical_ingredients LIMIT 3`
  console.log('\nSample canonical:', JSON.stringify(sample))

  const sampleSip = await sql`SELECT * FROM openclaw.system_ingredient_prices LIMIT 2`
  console.log('Sample sip:', JSON.stringify(sampleSip))

  await sql.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
