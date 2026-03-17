// Syncs local crawler_findings to Supabase directory_listings table.
// Runs periodically, pushing new findings in batches.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { dirname } from 'path'
import config from '../config.json' with { type: 'json' }

const BASE_DIR = join(dirname(new URL(import.meta.url).pathname), '..', config.storage.findingsDir)

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
 * Sync all local findings to Supabase.
 * Returns { synced, skipped, failed }.
 */
export async function syncToSupabase() {
  const sb = getClient()
  if (!sb) {
    console.log('[sync] No Supabase key, skipping sync')
    return { synced: 0, skipped: 0, failed: 0 }
  }

  const usDir = join(BASE_DIR, 'US')
  if (!existsSync(usDir)) return { synced: 0, skipped: 0, failed: 0 }

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

  const states = readdirSync(usDir).filter((f) => {
    try { return statSync(join(usDir, f)).isDirectory() } catch { return false }
  })

  for (const state of states) {
    const files = readdirSync(join(usDir, state)).filter((f) => f.endsWith('.json'))
    for (const file of files) {
      let businesses
      try {
        businesses = JSON.parse(readFileSync(join(usDir, state, file), 'utf-8'))
      } catch { continue }

      for (const biz of businesses) {
        const city = biz.address?.city || null
        const baseSlug = slugify(`${biz.name}-${city || 'us'}`)
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
          state: biz.address?.state || state,
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
    }
  }

  return { synced, skipped, failed }
}
