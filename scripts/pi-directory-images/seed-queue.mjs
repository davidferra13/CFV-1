#!/usr/bin/env node

/**
 * Seed the image queue from ChefFlow's directory_listings table.
 * Pulls all listings without photos and inserts them into the SQLite queue.
 *
 * Usage:
 *   node seed-queue.mjs                              # seed from ChefFlow DB directly
 *   node seed-queue.mjs --chefflow-db=postgresql://...  # custom DB URL
 *   node seed-queue.mjs --limit=10000                # limit rows
 *   node seed-queue.mjs --state=MA                   # filter by state
 */

import { queries } from './db.mjs'
import postgres from 'postgres'

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, v] = a.slice(2).split('=')
      return [k, v ?? 'true']
    })
)

const DB_URL = args['chefflow-db'] || process.env.CHEFFLOW_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const LIMIT = parseInt(args.limit) || 999999
const STATE_FILTER = args.state || null

async function main() {
  console.log(`\nSeeding image queue from ChefFlow`)
  console.log(`DB: ${DB_URL.replace(/:[^:@]+@/, ':***@')}`)
  console.log(`Limit: ${LIMIT} | State: ${STATE_FILTER || 'all'}\n`)

  const sql = postgres(DB_URL)

  try {
    // Pull listings without photos
    let rows
    if (STATE_FILTER) {
      rows = await sql`
        SELECT id as listing_id, name, city, state, website_url, lat, lon
        FROM directory_listings
        WHERE (photo_urls IS NULL OR photo_urls = '{}')
          AND status IN ('discovered', 'claimed', 'verified')
          AND state = ${STATE_FILTER}
        ORDER BY lead_score DESC NULLS LAST
        LIMIT ${LIMIT}
      `
    } else {
      rows = await sql`
        SELECT id as listing_id, name, city, state, website_url, lat, lon
        FROM directory_listings
        WHERE (photo_urls IS NULL OR photo_urls = '{}')
          AND status IN ('discovered', 'claimed', 'verified')
        ORDER BY lead_score DESC NULLS LAST
        LIMIT ${LIMIT}
      `
    }

    console.log(`Fetched ${rows.length} listings from ChefFlow`)

    if (rows.length === 0) {
      console.log('No listings need photos.')
      await sql.end()
      return
    }

    // Batch insert into SQLite (1000 at a time)
    let inserted = 0
    const BATCH = 1000
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      queries.upsertBatch(batch)
      inserted += batch.length
      process.stdout.write(`\r  Inserted ${inserted}/${rows.length}`)
    }

    console.log(`\n\nDone! Queue seeded with ${rows.length} listings.`)
    const stats = queries.getStats.get()
    console.log(`Queue totals: ${JSON.stringify(stats)}`)

    await sql.end()
  } catch (err) {
    console.error('Error:', err.message)
    await sql.end()
    process.exit(1)
  }
}

main()
