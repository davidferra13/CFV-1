#!/usr/bin/env node

// ChefFlow Directory Crawler
// Pulls food businesses from OpenStreetMap and inserts them into the directory.
//
// Usage:
//   node index.mjs                    # Crawl all configured regions
//   node index.mjs --region "Austin"  # Crawl a specific region (partial match)
//   DRY_RUN=1 node index.mjs         # Preview without inserting
//
// Environment:
//   DB_SERVICE_ROLE_KEY   Required (unless dry run)
//
// Designed to run on a Raspberry Pi via cron:
//   0 3 * * * cd /home/pi/crawler && DB_SERVICE_ROLE_KEY=xxx node index.mjs >> crawl.log 2>&1

import config from './config.json' with { type: 'json' }
import { crawlRegion } from './osm.mjs'
import { classifyListing } from './classify.mjs'
import { insertListings } from './insert.mjs'

const DRY_RUN = process.env.DRY_RUN === '1'

// Parse --region flag
function getTargetRegions() {
  const regionArg = process.argv.indexOf('--region')
  if (regionArg === -1) return config.regions

  const regionName = process.argv[regionArg + 1]
  if (!regionName) {
    console.error('Usage: node index.mjs --region "City Name"')
    process.exit(1)
  }

  const matches = config.regions.filter((r) =>
    r.name.toLowerCase().includes(regionName.toLowerCase())
  )

  if (matches.length === 0) {
    console.error(`No regions matching "${regionName}". Available:`)
    config.regions.forEach((r) => console.error(`  - ${r.name}`))
    process.exit(1)
  }

  return matches
}

async function main() {
  const startTime = Date.now()
  const regions = getTargetRegions()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`ChefFlow Directory Crawler`)
  console.log(`${new Date().toISOString()}`)
  console.log(`Regions: ${regions.map((r) => r.name).join(', ')}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no inserts)' : 'LIVE'}`)
  console.log(`${'='.repeat(60)}\n`)

  const totals = { crawled: 0, classified: 0, inserted: 0, skipped: 0, failed: 0 }

  for (const region of regions) {
    console.log(`\n--- ${region.name} ---`)

    // Step 1: Crawl OSM
    const rawListings = await crawlRegion(region)
    totals.crawled += rawListings.length

    if (rawListings.length === 0) {
      console.log(`[skip] No results for ${region.name}`)
      continue
    }

    // Step 2: Classify (deterministic, no LLM)
    const classified = rawListings.map((raw) => classifyListing(raw, region))
    totals.classified += classified.length

    // Step 3: Insert with deduplication
    const result = await insertListings(classified, DRY_RUN)
    totals.inserted += result.inserted
    totals.skipped += result.skipped
    totals.failed += result.failed

    console.log(
      `[done] ${region.name}: +${result.inserted} new, ${result.skipped} dupes, ${result.failed} errors`
    )
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log(`\n${'='.repeat(60)}`)
  console.log(`CRAWL COMPLETE (${elapsed}s)`)
  console.log(`  Crawled:    ${totals.crawled} raw listings from OSM`)
  console.log(`  Classified: ${totals.classified} listings`)
  console.log(`  Inserted:   ${totals.inserted} new listings`)
  console.log(`  Skipped:    ${totals.skipped} duplicates`)
  console.log(`  Failed:     ${totals.failed} errors`)
  console.log(`${'='.repeat(60)}\n`)
}

main().catch((err) => {
  console.error('[fatal]', err)
  process.exit(1)
})
