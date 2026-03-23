// Syncs local crawler_findings to Supabase directory_listings table.
// Runs periodically, pushing new findings in batches.

import { createClient } from '../../lib/supabase.mjs'
import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import config from '../config.json' with { type: 'json' }

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_DIR = join(__dirname, '..', config.storage.findingsDir)

let supabase = null

function getClient() {
  if (supabase) return supabase
  const url = config.supabase.url
  const key = process.env[config.supabase.serviceRoleKeyEnv]
  if (!key) return null
  supabase = createClient(url, key)
  return supabase
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// Map OSM amenity/shop tags to ChefFlow business types
const TYPE_MAP = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  fast_food: 'fast_food',
  ice_cream: 'dessert',
  bar: 'bar',
  pub: 'bar',
  food_court: 'restaurant',
  biergarten: 'bar',
  bakery: 'bakery',
  pastry: 'bakery',
  confectionery: 'dessert',
  deli: 'deli',
  butcher: 'butcher',
  cheese: 'specialty',
  chocolate: 'dessert',
  coffee: 'cafe',
  tea: 'cafe',
  seafood: 'seafood',
  farm: 'farm',
}

function classifyBusiness(biz) {
  return TYPE_MAP[biz.amenity] || TYPE_MAP[biz.shop] || 'restaurant'
}

/**
 * Sync a single city JSON file to Supabase.
 */
async function syncFile(sb, filePath, regionCode, existing) {
  let synced = 0, skipped = 0, failed = 0
  let businesses
  try {
    businesses = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch { return { synced, skipped, failed } }

  for (const biz of businesses) {
    const city = biz.address?.city || null
    const baseSlug = slugify(`${biz.name}-${city || regionCode.toLowerCase()}`)
    const nameKey = `${biz.name.toLowerCase()}|${(city || '').toLowerCase()}`

    if (existing.has(baseSlug) || existing.has(nameKey)) {
      skipped++
      continue
    }

    let slug = baseSlug
    let suffix = 2
    while (existing.has(slug)) {
      slug = `${baseSlug}-${suffix++}`
    }

    const { error } = await sb.from('directory_listings').insert({
      name: biz.name,
      slug,
      city,
      state: biz.address?.state || regionCode,
      business_type: classifyBusiness(biz),
      cuisine_types: biz.cuisine ? biz.cuisine.split(';').map((c) => c.trim()) : null,
      website_url: biz.website,
      status: 'discovered',
      source: 'openstreetmap',
      source_id: biz.osm_id,
    })

    if (error) {
      if (error.code === '23505') skipped++
      else failed++
    } else {
      existing.add(slug)
      existing.add(nameKey)
      synced++
    }
  }

  return { synced, skipped, failed }
}

/**
 * Sync all local findings to Supabase.
 * Returns { synced, skipped, failed }.
 */
export async function syncToSupabase() {
  const sb = getClient()
  if (!sb) {
    console.log('[sync] No Supabase key, skipping sync')
    return { synced: 0, skipped: 0, failed: 0 }
  }

  if (!existsSync(BASE_DIR)) return { synced: 0, skipped: 0, failed: 0 }

  // Load existing slugs for dedup
  const existing = new Set()
  let offset = 0
  while (true) {
    const { data, error } = await sb
      .from('directory_listings')
      .select('slug, name, city')
      .range(offset, offset + 999)
    if (error || !data || data.length === 0) break
    for (const row of data) {
      existing.add(row.slug)
      existing.add(`${row.name?.toLowerCase()}|${row.city?.toLowerCase()}`)
    }
    offset += 1000
    if (data.length < 1000) break
  }

  let synced = 0, skipped = 0, failed = 0

  // Walk all country/region directories (US, FR, GB, etc.)
  const topDirs = readdirSync(BASE_DIR).filter((f) => {
    try { return statSync(join(BASE_DIR, f)).isDirectory() } catch { return false }
  })

  for (const topDir of topDirs) {
    const topPath = join(BASE_DIR, topDir)
    const subEntries = readdirSync(topPath)

    // Check if this dir has subdirectories (e.g. US/MA/) or direct JSON files (e.g. FR/paris.json)
    const subDirs = subEntries.filter((f) => {
      try { return statSync(join(topPath, f)).isDirectory() } catch { return false }
    })
    const jsonFiles = subEntries.filter((f) => f.endsWith('.json'))

    // Process subdirectories (US/{STATE}/*.json pattern)
    for (const subDir of subDirs) {
      const files = readdirSync(join(topPath, subDir)).filter((f) => f.endsWith('.json'))
      for (const file of files) {
        const result = await syncFile(sb, join(topPath, subDir, file), subDir, existing)
        synced += result.synced; skipped += result.skipped; failed += result.failed
      }
    }

    // Process direct JSON files ({COUNTRY}/*.json pattern)
    for (const file of jsonFiles) {
      const result = await syncFile(sb, join(topPath, file), topDir, existing)
      synced += result.synced; skipped += result.skipped; failed += result.failed
    }
  }

  return { synced, skipped, failed }
}
