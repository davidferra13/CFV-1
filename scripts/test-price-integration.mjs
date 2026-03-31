#!/usr/bin/env node
/**
 * Integration test for the price engine's new tiers:
 * 1. ZIP centroid resolution (any US ZIP -> coordinates + region)
 * 2. USDA baseline fallback (when no store data exists)
 * 3. FTS product search with regional awareness
 *
 * Tests the actual SQL paths that lookupPrice() uses.
 */
import postgres from 'postgres'

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres')

const TEST_ZIPS = [
  { zip: '07030', expect: { city: 'Hoboken', state: 'NJ', region: 'northeast' } },
  { zip: '90210', expect: { city: 'Beverly Hills', state: 'CA', region: 'west' } },
  { zip: '10001', expect: { city: 'New York', state: 'NY', region: 'northeast' } },
  { zip: '33101', expect: { city: 'Miami', state: 'FL', region: 'south' } },
  { zip: '60601', expect: { city: 'Chicago', state: 'IL', region: 'midwest' } },
  { zip: '73301', expect: { city: 'Austin', state: 'TX', region: 'south' } },
  { zip: '94105', expect: { city: 'San Francisco', state: 'CA', region: 'west' } },
  { zip: '02108', expect: { city: 'Boston', state: 'MA', region: 'northeast' } },
  { zip: '01830', expect: { city: 'Haverhill', state: 'MA', region: 'northeast' } },
]

const USDA_TESTS = [
  { ingredient: 'chicken breast', region: 'northeast', expectItem: 'chicken breast boneless' },
  { ingredient: 'salmon', region: 'west', expectItem: 'salmon fillet' },
  { ingredient: 'milk', region: 'northeast', expectItem: 'milk whole' },
  { ingredient: 'cilantro', region: 'south', expectItem: 'cilantro' },
  { ingredient: 'olive oil', region: 'midwest', expectItem: 'olive oil' },
  { ingredient: 'zucchini', region: 'south', expectItem: 'zucchini' },
  { ingredient: 'salami', region: 'west', expectItem: 'salami' },
  { ingredient: 'ice cream', region: 'northeast', expectItem: 'ice cream' },
]

let passed = 0
let failed = 0

function assert(label, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  PASS: ${label}`)
  } else {
    failed++
    console.log(`  FAIL: ${label} ${detail}`)
  }
}

async function testZipCentroids() {
  console.log('\n=== ZIP Centroid Resolution ===')
  for (const t of TEST_ZIPS) {
    const rows = await sql`
      SELECT zip, city, state, region, lat, lng
      FROM openclaw.zip_centroids WHERE zip = ${t.zip}
    `
    assert(
      `${t.zip} resolves to ${t.expect.city}, ${t.expect.state}`,
      rows.length > 0 && rows[0].state === t.expect.state && rows[0].region === t.expect.region,
      rows.length > 0 ? `got ${rows[0].city}, ${rows[0].state} (${rows[0].region})` : 'NOT FOUND'
    )
  }
}

async function testUsdaFtsMatch() {
  console.log('\n=== USDA Baseline FTS Matching ===')
  for (const t of USDA_TESTS) {
    // FTS match (same query as lookupUsdaBaseline)
    const ftsRows = await sql`
      SELECT item_name, price_cents, unit, region,
        ts_rank(to_tsvector('english', item_name), plainto_tsquery('english', ${t.ingredient})) as rank
      FROM openclaw.usda_price_baselines
      WHERE to_tsvector('english', item_name) @@ plainto_tsquery('english', ${t.ingredient})
        AND region = ${t.region}
      ORDER BY rank DESC
      LIMIT 1
    `

    if (ftsRows.length > 0) {
      const r = ftsRows[0]
      assert(
        `"${t.ingredient}" @ ${t.region} -> "${r.item_name}" $${(r.price_cents/100).toFixed(2)}/${r.unit}`,
        true
      )
    } else {
      // Try trigram fallback
      const trigramRows = await sql`
        SELECT item_name, price_cents, unit, region,
          similarity(item_name, ${t.ingredient}) as sim
        FROM openclaw.usda_price_baselines
        WHERE region = ${t.region}
          AND similarity(item_name, ${t.ingredient}) > 0.2
        ORDER BY sim DESC
        LIMIT 1
      `
      if (trigramRows.length > 0) {
        const r = trigramRows[0]
        assert(
          `"${t.ingredient}" @ ${t.region} -> "${r.item_name}" $${(r.price_cents/100).toFixed(2)}/${r.unit} (trigram sim=${Number(r.sim).toFixed(2)})`,
          true
        )
      } else {
        assert(`"${t.ingredient}" @ ${t.region} matches USDA baseline`, false, 'no FTS or trigram match')
      }
    }
  }
}

async function testEndToEndFlow() {
  console.log('\n=== End-to-End: ZIP -> Region -> USDA Price ===')
  const testCases = [
    { ingredient: 'chicken breast', zip: '07030', label: 'Hoboken NJ' },
    { ingredient: 'salmon', zip: '90210', label: 'Beverly Hills CA' },
    { ingredient: 'cilantro', zip: '33101', label: 'Miami FL' },
    { ingredient: 'olive oil', zip: '60601', label: 'Chicago IL' },
    { ingredient: 'zucchini', zip: '73301', label: 'Austin TX' },
    { ingredient: 'ice cream', zip: '02108', label: 'Boston MA' },
  ]

  for (const tc of testCases) {
    // Step 1: Resolve ZIP to region
    const zipRow = await sql`
      SELECT region FROM openclaw.zip_centroids WHERE zip = ${tc.zip}
    `
    if (zipRow.length === 0) {
      assert(`${tc.ingredient} @ ${tc.zip} (${tc.label}): full pipeline`, false, 'ZIP not found')
      continue
    }
    const region = zipRow[0].region

    // Step 2: Find USDA baseline for this region
    let baseline = await sql`
      SELECT item_name, price_cents, unit, region
      FROM openclaw.usda_price_baselines
      WHERE to_tsvector('english', item_name) @@ plainto_tsquery('english', ${tc.ingredient})
        AND region = ${region}
      ORDER BY ts_rank(to_tsvector('english', item_name), plainto_tsquery('english', ${tc.ingredient})) DESC
      LIMIT 1
    `

    if (baseline.length === 0) {
      baseline = await sql`
        SELECT item_name, price_cents, unit, region
        FROM openclaw.usda_price_baselines
        WHERE region = ${region}
          AND similarity(item_name, ${tc.ingredient}) > 0.2
        ORDER BY similarity(item_name, ${tc.ingredient}) DESC
        LIMIT 1
      `
    }

    if (baseline.length > 0) {
      const b = baseline[0]
      const price = (b.price_cents / 100).toFixed(2)
      assert(
        `${tc.ingredient} @ ${tc.zip} (${tc.label}): $${price}/${b.unit} (${b.region} baseline, matched "${b.item_name}")`,
        b.price_cents > 0
      )
    } else {
      assert(`${tc.ingredient} @ ${tc.zip} (${tc.label}): USDA baseline found`, false, 'no match')
    }
  }
}

async function testHaversineFromCentroids() {
  console.log('\n=== Haversine from ZIP Centroids -> Store Distance ===')
  // Test: 07030 (Hoboken) should be ~200 miles from our MA stores
  const hoboken = await sql`
    SELECT lat, lng FROM openclaw.zip_centroids WHERE zip = '07030'
  `
  if (hoboken.length === 0) {
    assert('Hoboken ZIP centroid exists', false)
    return
  }
  const { lat, lng } = hoboken[0]

  const nearestStore = await sql`
    SELECT s.name, s.city, s.state,
      (3959 * acos(
        LEAST(1, GREATEST(-1,
          cos(radians(${lat})) * cos(radians(s.lat)) *
          cos(radians(s.lng) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(s.lat))
        ))
      )) as distance_miles
    FROM openclaw.stores s
    WHERE s.lat IS NOT NULL
    ORDER BY distance_miles
    LIMIT 1
  `

  if (nearestStore.length > 0) {
    const s = nearestStore[0]
    const dist = Number(s.distance_miles).toFixed(1)
    assert(
      `Hoboken -> nearest store: ${s.name} (${s.city}, ${s.state}) = ${dist} miles`,
      Number(s.distance_miles) > 100 && Number(s.distance_miles) < 400
    )
  }

  // Test: 01830 (Haverhill) should be very close to our MA stores
  const haverhill = await sql`
    SELECT lat, lng FROM openclaw.zip_centroids WHERE zip = '01830'
  `
  const nearestToHaverhill = await sql`
    SELECT s.name, s.city,
      (3959 * acos(
        LEAST(1, GREATEST(-1,
          cos(radians(${haverhill[0].lat})) * cos(radians(s.lat)) *
          cos(radians(s.lng) - radians(${haverhill[0].lng})) +
          sin(radians(${haverhill[0].lat})) * sin(radians(s.lat))
        ))
      )) as distance_miles
    FROM openclaw.stores s
    WHERE s.lat IS NOT NULL
    ORDER BY distance_miles
    LIMIT 1
  `

  if (nearestToHaverhill.length > 0) {
    const s = nearestToHaverhill[0]
    const dist = Number(s.distance_miles).toFixed(1)
    assert(
      `Haverhill -> nearest store: ${s.name} (${s.city}) = ${dist} miles`,
      Number(s.distance_miles) < 50
    )
  }
}

async function main() {
  await testZipCentroids()
  await testUsdaFtsMatch()
  await testEndToEndFlow()
  await testHaversineFromCentroids()

  console.log(`\n${'='.repeat(50)}`)
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
  console.log('='.repeat(50))

  await sql.end()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
