#!/usr/bin/env node
/**
 * Store Deduplication Audit
 *
 * Finds potential duplicate stores between OSM (219K) and SNAP (255K) datasets.
 * Uses geo-proximity (50m) + chain matching to identify overlapping records.
 *
 * Usage:
 *   node scripts/audit-store-duplicates.mjs              # dry-run report only
 *   node scripts/audit-store-duplicates.mjs --deactivate # mark OSM dupes inactive
 *   node scripts/audit-store-duplicates.mjs --state MA   # limit to one state
 *   node scripts/audit-store-duplicates.mjs --verbose    # show sample clusters
 */

import pg from 'postgres'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = pg(DATABASE_URL, { max: 5, idle_timeout: 30 })

// ~50 meters in degrees latitude (approximate, works for continental US)
const GEO_THRESHOLD_DEG = 0.00045

const args = process.argv.slice(2)
const DEACTIVATE = args.includes('--deactivate')
const VERBOSE = args.includes('--verbose')
const STATE_FILTER = args.includes('--state') ? args[args.indexOf('--state') + 1]?.toUpperCase() : null

// ---------------------------------------------------------------------------
// Name normalization for fuzzy matching
// ---------------------------------------------------------------------------

function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/\b(inc|llc|corp|co|ltd|the|store|market|markets|supermarket|supercenter|grocery)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function namesMatch(a, b) {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return false
  // Exact normalized match
  if (na === nb) return true
  // One contains the other (handles "Walmart" vs "Walmart Supercenter")
  if (na.includes(nb) || nb.includes(na)) return true
  // Check if short edit distance (simple: shared prefix >= 80% of shorter)
  const shorter = Math.min(na.length, nb.length)
  if (shorter < 4) return na === nb
  let shared = 0
  for (let i = 0; i < Math.min(na.length, nb.length); i++) {
    if (na[i] === nb[i]) shared++
    else break
  }
  return shared >= shorter * 0.8
}

// ---------------------------------------------------------------------------
// Main query: find cross-source duplicates
// ---------------------------------------------------------------------------

async function findDuplicates() {
  console.log('=== Store Deduplication Audit ===')
  console.log(`Mode: ${DEACTIVATE ? 'DEACTIVATE (will mark OSM dupes inactive)' : 'DRY RUN (report only)'}`)
  if (STATE_FILTER) console.log(`State filter: ${STATE_FILTER}`)
  console.log()

  // Get counts
  const [osmCount] = await sql`
    SELECT COUNT(*) as cnt FROM openclaw.stores
    WHERE external_store_id LIKE 'osm-%' AND is_active = true
    ${STATE_FILTER ? sql`AND state = ${STATE_FILTER}` : sql``}
  `
  const [snapCount] = await sql`
    SELECT COUNT(*) as cnt FROM openclaw.stores
    WHERE external_store_id LIKE 'snap-fns-%' AND is_active = true
    ${STATE_FILTER ? sql`AND state = ${STATE_FILTER}` : sql``}
  `
  console.log(`Active OSM stores:  ${Number(osmCount.cnt).toLocaleString()}`)
  console.log(`Active SNAP stores: ${Number(snapCount.cnt).toLocaleString()}`)
  console.log()

  // Strategy: For each state, find OSM stores that have a SNAP store
  // with the same chain_id within GEO_THRESHOLD_DEG of lat/lng.
  // This uses the DB index on (lat, lng) and chain_id for efficiency.

  const states = STATE_FILTER
    ? [STATE_FILTER]
    : (await sql`SELECT DISTINCT state FROM openclaw.stores WHERE state IS NOT NULL ORDER BY state`).map(r => r.state)

  let totalDuplicates = 0
  let totalDeactivated = 0
  const chainDupCounts = new Map()
  const stateDupCounts = new Map()
  const sampleClusters = []

  for (const state of states) {
    // Method 1: Same chain_id + geo proximity
    const chainMatches = await sql`
      SELECT
        osm.id AS osm_id,
        osm.name AS osm_name,
        osm.lat AS osm_lat,
        osm.lng AS osm_lng,
        osm.chain_id,
        snap.id AS snap_id,
        snap.name AS snap_name,
        snap.lat AS snap_lat,
        snap.lng AS snap_lng,
        c.name AS chain_name,
        c.slug AS chain_slug
      FROM openclaw.stores osm
      JOIN openclaw.stores snap
        ON snap.chain_id = osm.chain_id
        AND snap.external_store_id LIKE 'snap-fns-%'
        AND snap.is_active = true
        AND ABS(snap.lat - osm.lat) < ${GEO_THRESHOLD_DEG}
        AND ABS(snap.lng - osm.lng) < ${GEO_THRESHOLD_DEG}
      JOIN openclaw.chains c ON c.id = osm.chain_id
      WHERE osm.external_store_id LIKE 'osm-%'
        AND osm.is_active = true
        AND osm.state = ${state}
        AND osm.lat IS NOT NULL
        AND osm.lng IS NOT NULL
    `

    // Method 2: Different chain but similar name + geo proximity
    // (handles cases where OSM and SNAP assigned different chains)
    const nameMatches = await sql`
      SELECT
        osm.id AS osm_id,
        osm.name AS osm_name,
        osm.lat AS osm_lat,
        osm.lng AS osm_lng,
        osm.chain_id AS osm_chain_id,
        snap.id AS snap_id,
        snap.name AS snap_name,
        snap.lat AS snap_lat,
        snap.lng AS snap_lng,
        snap.chain_id AS snap_chain_id,
        oc.name AS osm_chain_name,
        sc.name AS snap_chain_name
      FROM openclaw.stores osm
      JOIN openclaw.stores snap
        ON snap.external_store_id LIKE 'snap-fns-%'
        AND snap.is_active = true
        AND snap.state = ${state}
        AND snap.chain_id != osm.chain_id
        AND ABS(snap.lat - osm.lat) < ${GEO_THRESHOLD_DEG}
        AND ABS(snap.lng - osm.lng) < ${GEO_THRESHOLD_DEG}
      JOIN openclaw.chains oc ON oc.id = osm.chain_id
      JOIN openclaw.chains sc ON sc.id = snap.chain_id
      WHERE osm.external_store_id LIKE 'osm-%'
        AND osm.is_active = true
        AND osm.state = ${state}
        AND osm.lat IS NOT NULL
        AND osm.lng IS NOT NULL
    `

    // Filter name matches by actual name similarity
    const validNameMatches = nameMatches.filter(r => namesMatch(r.osm_name, r.snap_name))

    const stateTotal = chainMatches.length + validNameMatches.length
    if (stateTotal > 0) {
      stateDupCounts.set(state, stateTotal)
      totalDuplicates += stateTotal
    }

    // Track chain-level counts
    for (const r of chainMatches) {
      const key = r.chain_name || r.chain_slug
      chainDupCounts.set(key, (chainDupCounts.get(key) || 0) + 1)
    }
    for (const r of validNameMatches) {
      const key = `${r.osm_chain_name}/${r.snap_chain_name}`
      chainDupCounts.set(key, (chainDupCounts.get(key) || 0) + 1)
    }

    // Collect samples
    if (VERBOSE && sampleClusters.length < 20) {
      for (const r of chainMatches.slice(0, 3)) {
        sampleClusters.push({
          state,
          type: 'chain-match',
          chain: r.chain_name,
          osm: `${r.osm_name} (${r.osm_lat}, ${r.osm_lng})`,
          snap: `${r.snap_name} (${r.snap_lat}, ${r.snap_lng})`,
        })
      }
      for (const r of validNameMatches.slice(0, 2)) {
        sampleClusters.push({
          state,
          type: 'name-match',
          osmChain: r.osm_chain_name,
          snapChain: r.snap_chain_name,
          osm: `${r.osm_name} (${r.osm_lat}, ${r.osm_lng})`,
          snap: `${r.snap_name} (${r.snap_lat}, ${r.snap_lng})`,
        })
      }
    }

    // Deactivate OSM duplicates if flag set
    if (DEACTIVATE && stateTotal > 0) {
      const osmIdsToDeactivate = [
        ...chainMatches.map(r => r.osm_id),
        ...validNameMatches.map(r => r.osm_id),
      ]
      // Deduplicate IDs (one OSM store might match multiple SNAP stores)
      const uniqueIds = [...new Set(osmIdsToDeactivate)]

      const result = await sql`
        UPDATE openclaw.stores
        SET is_active = false, updated_at = NOW()
        WHERE id = ANY(${uniqueIds})
          AND is_active = true
      `
      totalDeactivated += result.count
      if (uniqueIds.length > 0) {
        console.log(`  [${state}] Deactivated ${result.count} OSM duplicates`)
      }
    }

    if (stateTotal > 0 && !DEACTIVATE) {
      process.stdout.write(`  [${state}] ${stateTotal} potential duplicates\n`)
    }
  }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  console.log('\n\n=== DEDUPLICATION REPORT ===\n')
  console.log(`Total potential duplicates: ${totalDuplicates.toLocaleString()}`)
  if (DEACTIVATE) {
    console.log(`Total OSM stores deactivated: ${totalDeactivated.toLocaleString()}`)
  }

  // Top chains with most duplicates
  const sortedChains = [...chainDupCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)

  if (sortedChains.length > 0) {
    console.log('\nTop chains with most duplicates:')
    for (const [chain, count] of sortedChains) {
      console.log(`  ${chain}: ${count.toLocaleString()}`)
    }
  }

  // State breakdown
  const sortedStates = [...stateDupCounts.entries()]
    .sort((a, b) => b[1] - a[1])

  if (sortedStates.length > 0) {
    console.log('\nState breakdown:')
    for (const [state, count] of sortedStates) {
      console.log(`  ${state}: ${count.toLocaleString()}`)
    }
  }

  // Sample clusters
  if (VERBOSE && sampleClusters.length > 0) {
    console.log('\nSample duplicate clusters:')
    for (const c of sampleClusters) {
      console.log(`  [${c.state}] ${c.type}${c.chain ? ` (${c.chain})` : ''}`)
      console.log(`    OSM:  ${c.osm}`)
      console.log(`    SNAP: ${c.snap}`)
      if (c.osmChain) console.log(`    Chains: OSM=${c.osmChain}, SNAP=${c.snapChain}`)
    }
  }

  // Final active counts
  const [finalOsm] = await sql`
    SELECT COUNT(*) as cnt FROM openclaw.stores
    WHERE external_store_id LIKE 'osm-%' AND is_active = true
  `
  const [finalSnap] = await sql`
    SELECT COUNT(*) as cnt FROM openclaw.stores
    WHERE external_store_id LIKE 'snap-fns-%' AND is_active = true
  `
  const [finalTotal] = await sql`
    SELECT COUNT(*) as cnt FROM openclaw.stores WHERE is_active = true
  `
  console.log('\nFinal active store counts:')
  console.log(`  OSM:   ${Number(finalOsm.cnt).toLocaleString()}`)
  console.log(`  SNAP:  ${Number(finalSnap.cnt).toLocaleString()}`)
  console.log(`  Total: ${Number(finalTotal.cnt).toLocaleString()}`)

  await sql.end()
}

findDuplicates().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
