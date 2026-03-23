// Supabase insertion with deduplication.
// Inserts classified listings into directory_listings as 'discovered' status.
// Skips duplicates by checking existing slugs and name+city combos.

import { createClient } from '../lib/supabase.mjs'
import config from './config.json' with { type: 'json' }

let supabase = null

function getClient() {
  if (supabase) return supabase

  const url = config.supabase.url
  const key = process.env[config.supabase.serviceRoleKeyEnv]

  if (!key) {
    throw new Error(
      `Missing ${config.supabase.serviceRoleKeyEnv} env var. ` +
        `Set it before running: export ${config.supabase.serviceRoleKeyEnv}=your-key`
    )
  }

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

// Load existing slugs and name+city combos for deduplication
async function loadExistingListings() {
  const sb = getClient()
  const existing = new Set()

  let offset = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await sb
      .from('directory_listings')
      .select('slug, name, city')
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error('[insert] Failed to load existing listings:', error.message)
      break
    }

    if (!data || data.length === 0) break

    for (const row of data) {
      existing.add(row.slug)
      // Also track name+city for fuzzy dedup
      const key = `${row.name?.toLowerCase()}|${row.city?.toLowerCase()}`
      existing.add(key)
    }

    offset += pageSize
    if (data.length < pageSize) break
  }

  console.log(`[insert] Loaded ${existing.size} existing entries for dedup`)
  return existing
}

// Insert a batch of classified listings
export async function insertListings(listings, dryRun = false) {
  let sb, existing

  if (dryRun) {
    console.log(`[insert] Dry run mode: skipping dedup check`)
    existing = new Set()
  } else {
    sb = getClient()
    existing = await loadExistingListings()
  }

  let inserted = 0
  let skipped = 0
  let failed = 0

  for (const listing of listings) {
    const baseSlug = slugify(`${listing.name}-${listing.city || 'us'}`)
    const nameKey = `${listing.name.toLowerCase()}|${(listing.city || '').toLowerCase()}`

    // Skip if we already have this business
    if (existing.has(baseSlug) || existing.has(nameKey)) {
      skipped++
      continue
    }

    // Generate unique slug
    let slug = baseSlug
    let suffix = 2
    while (existing.has(slug)) {
      slug = `${baseSlug}-${suffix}`
      suffix++
    }

    if (dryRun) {
      console.log(`[dry-run] Would insert: ${listing.name} (${listing.city}, ${listing.state}) [${listing.businessType}] -> /discover/${slug}`)
      existing.add(slug)
      existing.add(nameKey)
      inserted++
      continue
    }

    const { error } = await sb.from('directory_listings').insert({
      name: listing.name,
      slug,
      city: listing.city || null,
      state: listing.state || null,
      business_type: listing.businessType,
      cuisine_types: listing.cuisineTypes,
      website_url: listing.websiteUrl,
      status: 'discovered',
      source: 'openstreetmap',
      source_id: listing.sourceId,
    })

    if (error) {
      // Unique constraint violation = already exists, skip silently
      if (error.code === '23505') {
        skipped++
      } else {
        console.error(`[insert] Failed to insert "${listing.name}":`, error.message)
        failed++
      }
    } else {
      existing.add(slug)
      existing.add(nameKey)
      inserted++
    }
  }

  return { inserted, skipped, failed }
}
