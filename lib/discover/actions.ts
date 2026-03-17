'use server'

// External Directory Listing Actions
// Public queries + admin mutations for the /discover directory.
// Uses admin client for all operations since this table uses service_role RLS.

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { slugify } from './constants'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DirectoryListing = {
  id: string
  name: string
  slug: string
  city: string | null
  neighborhood: string | null
  state: string | null
  cuisine_types: string[]
  business_type: string
  website_url: string | null
  status: string
  address: string | null
  phone: string | null
  email: string | null
  description: string | null
  hours: Record<string, string> | null
  photo_urls: string[]
  menu_url: string | null
  price_range: string | null
  source: string
  featured: boolean
  claimed_by_name: string | null
  claimed_at: string | null
  created_at: string
  updated_at: string
}

export type DirectoryListingSummary = Pick<
  DirectoryListing,
  | 'id'
  | 'name'
  | 'slug'
  | 'city'
  | 'state'
  | 'cuisine_types'
  | 'business_type'
  | 'website_url'
  | 'status'
  | 'price_range'
  | 'featured'
  | 'description'
  | 'photo_urls'
>

// ─── Public Queries ───────────────────────────────────────────────────────────

export type DiscoverFilters = {
  query?: string
  businessType?: string
  cuisine?: string
  city?: string
  state?: string
  priceRange?: string
}

export async function getDirectoryListings(
  filters: DiscoverFilters = {}
): Promise<DirectoryListingSummary[]> {
  const supabase = createServerClient({ admin: true })

  let query = supabase
    .from('directory_listings')
    .select(
      'id, name, slug, city, state, cuisine_types, business_type, website_url, status, price_range, featured, description, photo_urls'
    )
    .in('status', ['discovered', 'claimed', 'verified'])
    .order('featured', { ascending: false })
    .order('name', { ascending: true })

  if (filters.businessType) {
    query = query.eq('business_type', filters.businessType)
  }

  if (filters.cuisine) {
    query = query.contains('cuisine_types', [filters.cuisine])
  }

  if (filters.state) {
    query = query.ilike('state', filters.state)
  }

  if (filters.city) {
    query = query.ilike('city', `%${filters.city}%`)
  }

  if (filters.priceRange) {
    query = query.eq('price_range', filters.priceRange)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getDirectoryListings]', error)
    return []
  }

  let results = (data || []) as DirectoryListingSummary[]

  // Client-side text search across name, city, cuisine_types
  if (filters.query) {
    const q = filters.query.toLowerCase()
    results = results.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.state?.toLowerCase().includes(q) ||
        l.cuisine_types.some((c) => c.toLowerCase().includes(q)) ||
        l.description?.toLowerCase().includes(q)
    )
  }

  return results
}

export async function getDirectoryListingBySlug(slug: string): Promise<DirectoryListing | null> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('directory_listings')
    .select('*')
    .eq('slug', slug)
    .neq('status', 'removed')
    .single()

  if (error || !data) {
    return null
  }

  return data as DirectoryListing
}

export async function getDirectoryFacets(): Promise<{
  businessTypes: { value: string; count: number }[]
  cuisines: { value: string; count: number }[]
  states: { value: string; count: number }[]
}> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('directory_listings')
    .select('business_type, cuisine_types, state')
    .in('status', ['discovered', 'claimed', 'verified'])

  if (error || !data) {
    return { businessTypes: [], cuisines: [], states: [] }
  }

  const typeCounts: Record<string, number> = {}
  const cuisineCounts: Record<string, number> = {}
  const stateCounts: Record<string, number> = {}

  for (const row of data) {
    const bt = (row as any).business_type
    if (bt) typeCounts[bt] = (typeCounts[bt] || 0) + 1

    const cuisines = (row as any).cuisine_types as string[]
    if (cuisines) {
      for (const c of cuisines) {
        cuisineCounts[c] = (cuisineCounts[c] || 0) + 1
      }
    }

    const st = (row as any).state
    if (st) stateCounts[st] = (stateCounts[st] || 0) + 1
  }

  return {
    businessTypes: Object.entries(typeCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    cuisines: Object.entries(cuisineCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    states: Object.entries(stateCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value)),
  }
}

// ─── Public Submissions ───────────────────────────────────────────────────────

export async function submitDirectoryListing(input: {
  name: string
  businessType: string
  city: string
  state: string
  cuisineTypes: string[]
  websiteUrl?: string
  email: string
  phone?: string
  description?: string
}): Promise<{ success: boolean; error?: string }> {
  if (!input.name.trim() || !input.email.trim()) {
    return { success: false, error: 'Name and email are required.' }
  }

  const supabase = createServerClient({ admin: true })

  const baseSlug = slugify(`${input.name}-${input.city || 'us'}`)

  // Ensure unique slug
  const { data: existing } = await supabase
    .from('directory_listings')
    .select('slug')
    .like('slug', `${baseSlug}%`)

  let slug = baseSlug
  if (existing && existing.length > 0) {
    slug = `${baseSlug}-${existing.length + 1}`
  }

  const { error } = await supabase.from('directory_listings').insert({
    name: input.name.trim(),
    slug,
    business_type: input.businessType,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    cuisine_types: input.cuisineTypes,
    website_url: input.websiteUrl?.trim() || null,
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    description: input.description?.trim() || null,
    status: 'pending_submission',
    source: 'submission',
    claimed_by_email: input.email.trim(),
    claimed_by_name: input.name.trim(),
  })

  if (error) {
    console.error('[submitDirectoryListing]', error)
    return { success: false, error: 'Failed to submit listing. Please try again.' }
  }

  revalidatePath('/discover')
  return { success: true }
}

export async function submitNomination(input: {
  businessName: string
  businessType: string
  city?: string
  state?: string
  websiteUrl?: string
  nominatorName?: string
  nominatorEmail?: string
  reason?: string
}): Promise<{ success: boolean; error?: string }> {
  if (!input.businessName.trim()) {
    return { success: false, error: 'Business name is required.' }
  }

  const supabase = createServerClient({ admin: true })

  const { error } = await supabase.from('directory_nominations').insert({
    business_name: input.businessName.trim(),
    business_type: input.businessType || 'restaurant',
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    website_url: input.websiteUrl?.trim() || null,
    nominator_name: input.nominatorName?.trim() || null,
    nominator_email: input.nominatorEmail?.trim() || null,
    reason: input.reason?.trim() || null,
  })

  if (error) {
    console.error('[submitNomination]', error)
    return { success: false, error: 'Failed to submit nomination.' }
  }

  return { success: true }
}

// ─── Claim & Removal ─────────────────────────────────────────────────────────

export async function requestListingClaim(input: {
  listingId: string
  name: string
  email: string
  phone?: string
  verificationNote?: string
}): Promise<{ success: boolean; error?: string }> {
  if (!input.name.trim() || !input.email.trim()) {
    return { success: false, error: 'Name and email are required.' }
  }

  const supabase = createServerClient({ admin: true })

  // Check listing exists and isn't already claimed
  const { data: listing } = await supabase
    .from('directory_listings')
    .select('id, status, claimed_by_email')
    .eq('id', input.listingId)
    .single()

  if (!listing) {
    return { success: false, error: 'Listing not found.' }
  }

  if (listing.status === 'claimed' || listing.status === 'verified') {
    return { success: false, error: 'This listing has already been claimed.' }
  }

  const claimToken = crypto.randomUUID()

  const { error } = await supabase
    .from('directory_listings')
    .update({
      status: 'claimed',
      claimed_by_name: input.name.trim(),
      claimed_by_email: input.email.trim(),
      claimed_at: new Date().toISOString(),
      claim_token: claimToken,
    })
    .eq('id', input.listingId)

  if (error) {
    console.error('[requestListingClaim]', error)
    return { success: false, error: 'Failed to process claim.' }
  }

  revalidatePath('/discover')
  return { success: true }
}

export async function requestListingRemoval(input: {
  listingId: string
  reason: string
  email: string
}): Promise<{ success: boolean; error?: string }> {
  if (!input.reason.trim() || !input.email.trim()) {
    return { success: false, error: 'Reason and email are required.' }
  }

  const supabase = createServerClient({ admin: true })

  const { error } = await supabase
    .from('directory_listings')
    .update({
      removal_requested_at: new Date().toISOString(),
      removal_reason: `${input.email}: ${input.reason.trim()}`,
    })
    .eq('id', input.listingId)

  if (error) {
    console.error('[requestListingRemoval]', error)
    return { success: false, error: 'Failed to submit removal request.' }
  }

  return { success: true }
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

export async function adminGetAllListings(): Promise<DirectoryListing[]> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('directory_listings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[adminGetAllListings]', error)
    return []
  }

  return (data || []) as DirectoryListing[]
}

export async function adminUpdateListingStatus(
  listingId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient({ admin: true })

  const updates: Record<string, any> = { status }
  if (status === 'removed') {
    updates.removed_at = new Date().toISOString()
  }

  const { error } = await supabase.from('directory_listings').update(updates).eq('id', listingId)

  if (error) {
    console.error('[adminUpdateListingStatus]', error)
    return { success: false, error: 'Failed to update status.' }
  }

  revalidatePath('/discover')
  revalidatePath('/admin/directory-listings')
  return { success: true }
}

export async function adminCreateListing(input: {
  name: string
  businessType: string
  city?: string
  state?: string
  cuisineTypes: string[]
  websiteUrl?: string
  source?: string
}): Promise<{ success: boolean; error?: string; slug?: string }> {
  if (!input.name.trim()) {
    return { success: false, error: 'Name is required.' }
  }

  const supabase = createServerClient({ admin: true })

  const baseSlug = slugify(`${input.name}-${input.city || 'us'}`)

  const { data: existing } = await supabase
    .from('directory_listings')
    .select('slug')
    .like('slug', `${baseSlug}%`)

  let slug = baseSlug
  if (existing && existing.length > 0) {
    slug = `${baseSlug}-${existing.length + 1}`
  }

  const { error } = await supabase.from('directory_listings').insert({
    name: input.name.trim(),
    slug,
    business_type: input.businessType || 'restaurant',
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    cuisine_types: input.cuisineTypes || [],
    website_url: input.websiteUrl?.trim() || null,
    status: 'discovered',
    source: input.source || 'manual',
  })

  if (error) {
    console.error('[adminCreateListing]', error)
    return { success: false, error: 'Failed to create listing.' }
  }

  revalidatePath('/discover')
  revalidatePath('/admin/directory-listings')
  return { success: true, slug }
}

export async function adminGetNominations(): Promise<any[]> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('directory_nominations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[adminGetNominations]', error)
    return []
  }

  return data || []
}

export async function adminReviewNomination(
  nominationId: string,
  status: 'approved' | 'rejected' | 'duplicate'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase
    .from('directory_nominations')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', nominationId)

  if (error) {
    console.error('[adminReviewNomination]', error)
    return { success: false, error: 'Failed to review nomination.' }
  }

  return { success: true }
}
