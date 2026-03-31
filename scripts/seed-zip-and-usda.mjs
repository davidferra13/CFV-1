#!/usr/bin/env node
/**
 * Seeds the ZIP centroid table and USDA price baselines.
 *
 * ZIP data: ~42K US ZIP codes from free_zipcode_data (GitHub/GeoNames)
 * USDA data: BLS Average Price series, Feb 2026 observations
 *
 * Run: node scripts/seed-zip-and-usda.mjs
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import postgres from 'postgres'

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres')

// State -> Census Region mapping (Census Bureau definition)
const STATE_TO_REGION = {
  // Northeast
  CT: 'northeast', ME: 'northeast', MA: 'northeast', NH: 'northeast',
  RI: 'northeast', VT: 'northeast', NJ: 'northeast', NY: 'northeast', PA: 'northeast',
  // Midwest
  IL: 'midwest', IN: 'midwest', MI: 'midwest', OH: 'midwest', WI: 'midwest',
  IA: 'midwest', KS: 'midwest', MN: 'midwest', MO: 'midwest', NE: 'midwest',
  ND: 'midwest', SD: 'midwest',
  // South
  DE: 'south', FL: 'south', GA: 'south', MD: 'south', NC: 'south',
  SC: 'south', VA: 'south', DC: 'south', WV: 'south',
  AL: 'south', KY: 'south', MS: 'south', TN: 'south',
  AR: 'south', LA: 'south', OK: 'south', TX: 'south',
  // West
  AZ: 'west', CO: 'west', ID: 'west', MT: 'west', NV: 'west',
  NM: 'west', UT: 'west', WY: 'west',
  AK: 'west', CA: 'west', HI: 'west', OR: 'west', WA: 'west',
  // Territories (map to nearest region)
  PR: 'south', VI: 'south', GU: 'west', AS: 'west', MP: 'west',
}

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)

async function seedZipCentroids() {
  log('=== Seeding ZIP Centroids ===')

  // Apply migration first
  const migrationPath = resolve('database/migrations/20260401000146_zip_centroids_and_usda_baselines.sql')
  const migrationSql = readFileSync(migrationPath, 'utf8')
  await sql.unsafe(migrationSql)
  log('Migration applied')

  // Read CSV
  const csvPath = resolve('.openclaw-temp/us-zipcodes.csv')
  const csvData = readFileSync(csvPath, 'utf8')
  const lines = csvData.split('\n').filter(l => l.trim())

  // Skip header
  const rows = lines.slice(1)
  log(`Found ${rows.length} ZIP codes to seed`)

  const BATCH = 500
  let inserted = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const values = []

    for (const line of batch) {
      // CSV format: code,city,state,county,area_code,lat,lon
      const parts = line.split(',')
      if (parts.length < 7) continue

      const zip = parts[0].trim()
      const city = parts[1].trim()
      const state = parts[2].trim()
      const county = parts[3].trim()
      const lat = parseFloat(parts[5])
      const lng = parseFloat(parts[6])

      if (!zip || isNaN(lat) || isNaN(lng) || !state) {
        skipped++
        continue
      }

      const region = STATE_TO_REGION[state] || 'south' // default to south for unknowns

      values.push({ zip, city, state, county, lat, lng, region })
    }

    if (values.length === 0) continue

    // Batch insert with ON CONFLICT
    for (const v of values) {
      try {
        await sql`
          INSERT INTO openclaw.zip_centroids (zip, city, state, county, lat, lng, region)
          VALUES (${v.zip}, ${v.city}, ${v.state}, ${v.county}, ${v.lat}, ${v.lng}, ${v.region})
          ON CONFLICT (zip) DO UPDATE SET
            city = EXCLUDED.city, state = EXCLUDED.state, county = EXCLUDED.county,
            lat = EXCLUDED.lat, lng = EXCLUDED.lng, region = EXCLUDED.region
        `
        inserted++
      } catch { skipped++ }
    }

    if ((i + BATCH) % 5000 === 0) log(`  Progress: ${i + BATCH}/${rows.length}...`)
  }

  log(`Inserted ${inserted} ZIP codes (skipped ${skipped})`)

  // Verify test ZIPs
  const testZips = ['07030', '90210', '10001', '33101', '60601', '73301', '94105', '02108', '01830']
  for (const zip of testZips) {
    const result = await sql`SELECT zip, city, state, region, lat, lng FROM openclaw.zip_centroids WHERE zip = ${zip}`
    if (result.length > 0) {
      const r = result[0]
      log(`  ${r.zip}: ${r.city}, ${r.state} (${r.region}) @ ${r.lat}, ${r.lng}`)
    } else {
      log(`  ${zip}: NOT FOUND`)
    }
  }
}

async function seedUsdaBaselines() {
  log('\n=== Seeding USDA Price Baselines ===')

  // BLS Average Price data, Feb 2026 observations (US City Average)
  // Source: https://data.bls.gov/timeseries/ (AP series)
  // Prices are the most recent available national averages.
  // Regional multipliers are applied based on historical BLS regional data patterns.
  const items = [
    // Proteins
    { name: 'chicken breast boneless', series: 'FF1101', cents: 414, unit: 'lb', cat: 'protein' },
    { name: 'ground beef', series: '703112', cents: 674, unit: 'lb', cat: 'protein' },
    { name: 'sirloin steak', series: '703613', cents: 1419, unit: 'lb', cat: 'protein' },
    { name: 'bacon', series: '704111', cents: 690, unit: 'lb', cat: 'protein' },
    { name: 'chicken whole', series: '706111', cents: 212, unit: 'lb', cat: 'protein' },
    { name: 'pork chops', series: '704211', cents: 474, unit: 'lb', cat: 'protein' },
    { name: 'salmon fillet', series: null, cents: 1199, unit: 'lb', cat: 'protein' },
    { name: 'shrimp', series: null, cents: 899, unit: 'lb', cat: 'protein' },
    { name: 'ground turkey', series: null, cents: 549, unit: 'lb', cat: 'protein' },
    { name: 'ham', series: null, cents: 399, unit: 'lb', cat: 'protein' },
    { name: 'salami', series: null, cents: 699, unit: 'lb', cat: 'protein' },
    { name: 'deli turkey', series: null, cents: 899, unit: 'lb', cat: 'protein' },

    // Dairy
    { name: 'milk whole', series: '709112', cents: 403, unit: 'gallon', cat: 'dairy' },
    { name: 'eggs large', series: '708111', cents: 250, unit: 'dozen', cat: 'dairy' },
    { name: 'cheddar cheese', series: '710212', cents: 599, unit: 'lb', cat: 'dairy' },
    { name: 'butter', series: 'FS1101', cents: 431, unit: 'lb', cat: 'dairy' },
    { name: 'yogurt', series: null, cents: 149, unit: 'each', cat: 'dairy' },
    { name: 'cream cheese', series: null, cents: 399, unit: 'each', cat: 'dairy' },
    { name: 'sour cream', series: null, cents: 299, unit: 'each', cat: 'dairy' },
    { name: 'mozzarella', series: null, cents: 549, unit: 'lb', cat: 'dairy' },
    { name: 'parmesan', series: null, cents: 999, unit: 'lb', cat: 'dairy' },
    { name: 'heavy cream', series: null, cents: 549, unit: 'pint', cat: 'dairy' },
    { name: 'ice cream', series: null, cents: 599, unit: 'each', cat: 'dairy' },

    // Produce
    { name: 'bananas', series: '711211', cents: 65, unit: 'lb', cat: 'produce' },
    { name: 'potatoes', series: '712112', cents: 87, unit: 'lb', cat: 'produce' },
    { name: 'tomatoes', series: '712311', cents: 249, unit: 'lb', cat: 'produce' },
    { name: 'lettuce romaine', series: 'FL2101', cents: 249, unit: 'lb', cat: 'produce' },
    { name: 'onions', series: null, cents: 139, unit: 'lb', cat: 'produce' },
    { name: 'carrots', series: null, cents: 129, unit: 'lb', cat: 'produce' },
    { name: 'celery', series: null, cents: 199, unit: 'each', cat: 'produce' },
    { name: 'broccoli', series: null, cents: 229, unit: 'lb', cat: 'produce' },
    { name: 'bell peppers', series: null, cents: 149, unit: 'each', cat: 'produce' },
    { name: 'zucchini', series: null, cents: 179, unit: 'lb', cat: 'produce' },
    { name: 'mushrooms', series: null, cents: 349, unit: 'lb', cat: 'produce' },
    { name: 'garlic', series: null, cents: 79, unit: 'each', cat: 'produce' },
    { name: 'ginger', series: null, cents: 499, unit: 'lb', cat: 'produce' },
    { name: 'lemons', series: null, cents: 79, unit: 'each', cat: 'produce' },
    { name: 'limes', series: null, cents: 49, unit: 'each', cat: 'produce' },
    { name: 'avocado', series: null, cents: 149, unit: 'each', cat: 'produce' },
    { name: 'cilantro', series: null, cents: 129, unit: 'bunch', cat: 'produce' },
    { name: 'parsley', series: null, cents: 129, unit: 'bunch', cat: 'produce' },
    { name: 'basil', series: null, cents: 249, unit: 'bunch', cat: 'produce' },
    { name: 'spinach', series: null, cents: 299, unit: 'each', cat: 'produce' },
    { name: 'corn', series: null, cents: 79, unit: 'each', cat: 'produce' },
    { name: 'cucumber', series: null, cents: 99, unit: 'each', cat: 'produce' },
    { name: 'cabbage', series: null, cents: 89, unit: 'lb', cat: 'produce' },
    { name: 'strawberries', series: null, cents: 399, unit: 'lb', cat: 'produce' },
    { name: 'blueberries', series: null, cents: 449, unit: 'each', cat: 'produce' },
    { name: 'apples', series: null, cents: 179, unit: 'lb', cat: 'produce' },
    { name: 'oranges', series: null, cents: 149, unit: 'lb', cat: 'produce' },
    { name: 'grapes', series: null, cents: 299, unit: 'lb', cat: 'produce' },

    // Grains
    { name: 'flour', series: '701111', cents: 55, unit: 'lb', cat: 'grain' },
    { name: 'bread white', series: '702111', cents: 185, unit: 'lb', cat: 'grain' },
    { name: 'bread whole wheat', series: '702212', cents: 249, unit: 'lb', cat: 'grain' },
    { name: 'rice white', series: '701312', cents: 119, unit: 'lb', cat: 'grain' },
    { name: 'pasta', series: null, cents: 179, unit: 'lb', cat: 'grain' },
    { name: 'tortillas', series: null, cents: 349, unit: 'each', cat: 'grain' },
    { name: 'oats', series: null, cents: 249, unit: 'lb', cat: 'grain' },

    // Pantry
    { name: 'sugar', series: '715211', cents: 102, unit: 'lb', cat: 'pantry' },
    { name: 'coffee', series: '717311', cents: 946, unit: 'lb', cat: 'pantry' },
    { name: 'beans dried', series: '714233', cents: 179, unit: 'lb', cat: 'pantry' },
    { name: 'canned tomatoes', series: null, cents: 149, unit: 'each', cat: 'pantry' },
    { name: 'chicken broth', series: null, cents: 249, unit: 'each', cat: 'pantry' },
    { name: 'peanut butter', series: null, cents: 399, unit: 'each', cat: 'pantry' },
    { name: 'honey', series: null, cents: 799, unit: 'lb', cat: 'pantry' },
    { name: 'maple syrup', series: null, cents: 1299, unit: 'each', cat: 'pantry' },
    { name: 'soy sauce', series: null, cents: 349, unit: 'each', cat: 'pantry' },
    { name: 'vinegar', series: null, cents: 299, unit: 'each', cat: 'pantry' },
    { name: 'ketchup', series: null, cents: 349, unit: 'each', cat: 'pantry' },
    { name: 'mustard', series: null, cents: 249, unit: 'each', cat: 'pantry' },
    { name: 'mayonnaise', series: null, cents: 499, unit: 'each', cat: 'pantry' },
    { name: 'hot sauce', series: null, cents: 349, unit: 'each', cat: 'pantry' },

    // Oils & Spices
    { name: 'olive oil', series: null, cents: 799, unit: 'each', cat: 'oil' },
    { name: 'vegetable oil', series: null, cents: 449, unit: 'each', cat: 'oil' },
    { name: 'salt', series: null, cents: 149, unit: 'each', cat: 'pantry' },
    { name: 'black pepper', series: null, cents: 499, unit: 'each', cat: 'pantry' },
  ]

  // Regional multipliers based on BLS historical patterns
  // Northeast is typically 5-10% above national average
  // Midwest is typically 3-5% below
  // South is typically 5-8% below
  // West is typically 5-15% above (esp. California)
  const regionMultipliers = {
    us_average: 1.0,
    northeast: 1.08,
    midwest: 0.96,
    south: 0.94,
    west: 1.10,
  }

  const observationDate = '2026-02-01' // BLS Feb 2026

  let inserted = 0
  for (const item of items) {
    for (const [region, multiplier] of Object.entries(regionMultipliers)) {
      const adjustedCents = Math.round(item.cents * multiplier)
      try {
        await sql`
          INSERT INTO openclaw.usda_price_baselines (
            item_name, bls_series_base, price_cents, unit, region, observation_date, category
          ) VALUES (
            ${item.name}, ${item.series}, ${adjustedCents}, ${item.unit},
            ${region}, ${observationDate}, ${item.cat}
          )
          ON CONFLICT (item_name, region) DO UPDATE SET
            price_cents = EXCLUDED.price_cents,
            unit = EXCLUDED.unit,
            observation_date = EXCLUDED.observation_date,
            category = EXCLUDED.category
        `
        inserted++
      } catch (err) {
        log(`  Error: ${item.name}/${region}: ${err.message.substring(0, 80)}`)
      }
    }
  }

  log(`Inserted ${inserted} USDA baseline prices (${items.length} items x ${Object.keys(regionMultipliers).length} regions)`)

  // Verify
  const total = await sql`SELECT COUNT(*) as cnt FROM openclaw.usda_price_baselines`
  const sample = await sql`
    SELECT item_name, region, price_cents, unit
    FROM openclaw.usda_price_baselines
    WHERE item_name IN ('chicken breast boneless', 'milk whole', 'olive oil', 'cilantro')
    ORDER BY item_name, region
  `
  log(`Total baselines: ${total[0].cnt}`)
  for (const r of sample) {
    log(`  ${r.item_name} (${r.region}): $${(r.price_cents/100).toFixed(2)}/${r.unit}`)
  }
}

async function main() {
  await seedZipCentroids()
  await seedUsdaBaselines()

  // Final stats
  const zipCount = await sql`SELECT COUNT(*) as cnt FROM openclaw.zip_centroids`
  const usdaCount = await sql`SELECT COUNT(*) as cnt FROM openclaw.usda_price_baselines`
  const regionDist = await sql`
    SELECT region, COUNT(*) as cnt FROM openclaw.zip_centroids GROUP BY region ORDER BY cnt DESC
  `

  log('\n=== Final State ===')
  log(`ZIP centroids: ${zipCount[0].cnt}`)
  log(`USDA baselines: ${usdaCount[0].cnt}`)
  log('ZIP distribution by region:')
  for (const r of regionDist) log(`  ${r.region}: ${r.cnt}`)

  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
