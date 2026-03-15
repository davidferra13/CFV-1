'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface DirectoryListingInput {
  business_name: string
  tagline?: string | null
  cuisines?: string[]
  dietary_specialties?: string[]
  service_types?: string[]
  city?: string | null
  state?: string | null
  zip_code?: string | null
  service_radius_miles?: number | null
  min_price_cents?: number | null
  max_price_cents?: number | null
  profile_photo_url?: string | null
  portfolio_urls?: string[]
  website_url?: string | null
}

export interface DirectorySearchFilters {
  city?: string
  state?: string
  cuisine?: string
  dietarySpecialty?: string
  serviceType?: string
  maxPrice?: number // cents
}

// ------------------------------------------------------------------
// Chef-owned actions (require auth)
// ------------------------------------------------------------------

export async function getMyListing() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('chef_directory_listings')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch listing: ${error.message}`)
  return data
}

export async function updateListing(input: DirectoryListingInput) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Check if listing exists
  const { data: existing } = await (supabase as any)
    .from('chef_directory_listings')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (existing) {
    const { error } = await (supabase as any)
      .from('chef_directory_listings')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', existing.id)

    if (error) throw new Error(`Failed to update listing: ${error.message}`)
  } else {
    const { error } = await (supabase as any)
      .from('chef_directory_listings')
      .insert({ chef_id: user.tenantId!, ...input })

    if (error) throw new Error(`Failed to create listing: ${error.message}`)
  }

  revalidatePath('/community/directory')
  revalidatePath('/settings/directory')
  return { success: true }
}

export async function togglePublished(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch current state (scoped to chef)
  const { data: listing, error: fetchErr } = await (supabase as any)
    .from('chef_directory_listings')
    .select('id, is_published')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchErr || !listing) throw new Error('Listing not found')

  const { error } = await (supabase as any)
    .from('chef_directory_listings')
    .update({
      is_published: !listing.is_published,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(`Failed to toggle publish: ${error.message}`)

  revalidatePath('/community/directory')
  revalidatePath('/settings/directory')
  return { success: true, is_published: !listing.is_published }
}

// ------------------------------------------------------------------
// Public actions (no auth required)
// ------------------------------------------------------------------

export async function searchDirectory(filters?: DirectorySearchFilters) {
  const supabase = createServerClient()

  let query = (supabase as any)
    .from('chef_directory_listings')
    .select('*')
    .eq('is_published', true)
    .order('featured', { ascending: false })
    .order('rating_avg', { ascending: false, nullsFirst: false })

  if (filters?.city) {
    query = query.ilike('city', `%${filters.city}%`)
  }
  if (filters?.state) {
    query = query.ilike('state', `%${filters.state}%`)
  }
  if (filters?.cuisine) {
    query = query.contains('cuisines', [filters.cuisine])
  }
  if (filters?.dietarySpecialty) {
    query = query.contains('dietary_specialties', [filters.dietarySpecialty])
  }
  if (filters?.serviceType) {
    query = query.contains('service_types', [filters.serviceType])
  }
  if (filters?.maxPrice) {
    query = query.lte('min_price_cents', filters.maxPrice)
  }

  const { data, error } = await query.limit(50)

  if (error) throw new Error(`Directory search failed: ${error.message}`)
  return data ?? []
}

export async function getDirectoryListing(id: string) {
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('chef_directory_listings')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (error) throw new Error(`Listing not found: ${error.message}`)
  return data
}

export async function getDirectoryStats() {
  const supabase = createServerClient()

  const { data: listings, error } = await (supabase as any)
    .from('chef_directory_listings')
    .select('state, cuisines')
    .eq('is_published', true)

  if (error) throw new Error(`Failed to fetch stats: ${error.message}`)

  const rows = listings ?? []
  const byState: Record<string, number> = {}
  const byCuisine: Record<string, number> = {}

  for (const row of rows) {
    const st = row.state || 'Unknown'
    byState[st] = (byState[st] || 0) + 1

    for (const c of row.cuisines ?? []) {
      byCuisine[c] = (byCuisine[c] || 0) + 1
    }
  }

  return {
    totalPublished: rows.length,
    byState,
    byCuisine,
  }
}
