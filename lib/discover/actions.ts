'use server'

// External Directory Listing Actions
// Public queries + admin mutations for the /discover directory.
// Uses admin client for all operations since this table uses service_role RLS.

import { createServerClient } from '@/lib/db/server'
import { pgClient } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { slugify, ITEMS_PER_PAGE, normalizeUsStateCode, US_STATES } from './constants'
import {
  sendDirectoryWelcomeEmail,
  sendDirectoryClaimedEmail,
  sendDirectoryVerifiedEmail,
} from './outreach'

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
  lat: number | null
  lon: number | null
  postcode: string | null
  lead_score: number | null
  osm_id: string | null
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
  | 'phone'
  | 'address'
  | 'lat'
  | 'lon'
  | 'lead_score'
>

export type PaginatedListings = {
  listings: DirectoryListingSummary[]
  total: number
  page: number
  totalPages: number
}

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''")
}

function buildCanonicalStateSql(columnName: string) {
  const trimmedColumn = `btrim(${columnName})`
  const upperColumn = `upper(${trimmedColumn})`
  const lowerColumn = `lower(${trimmedColumn})`
  const cases = Object.entries(US_STATES).flatMap(([code, name]) => [
    `WHEN ${upperColumn} = '${escapeSqlLiteral(code)}' THEN '${escapeSqlLiteral(code)}'`,
    `WHEN ${lowerColumn} = '${escapeSqlLiteral(name.toLowerCase())}' THEN '${escapeSqlLiteral(code)}'`,
  ])

  return `CASE WHEN ${columnName} IS NULL THEN NULL ${cases.join(' ')} ELSE NULL END`
}

const CANONICAL_STATE_SQL = buildCanonicalStateSql('state')

// ─── Public Queries ───────────────────────────────────────────────────────────

export type DiscoverFilters = {
  query?: string
  businessType?: string
  cuisine?: string
  city?: string
  state?: string
  priceRange?: string
  page?: number
}

export async function getDirectoryListings(
  filters: DiscoverFilters = {}
): Promise<PaginatedListings> {
  const page = Math.max(1, filters.page || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE
  const normalizedStateFilter = filters.state ? normalizeUsStateCode(filters.state) : null

  if (filters.state && !normalizedStateFilter) {
    return { listings: [], total: 0, page, totalPages: 1 }
  }

  try {
    // Build WHERE conditions
    const conditions: string[] = ["status IN ('discovered', 'claimed', 'verified')"]
    const params: any[] = []
    let paramIndex = 1

    if (filters.query) {
      // Full-text search with prefix matching on last word
      const terms = filters.query.trim().split(/\s+/).filter(Boolean)
      if (terms.length > 0) {
        const tsQuery = terms.map((t, i) => (i === terms.length - 1 ? `${t}:*` : t)).join(' & ')
        conditions.push(`search_vector @@ to_tsquery('english', $${paramIndex})`)
        params.push(tsQuery)
        paramIndex++
      }
    }

    if (filters.businessType) {
      conditions.push(`business_type = $${paramIndex}`)
      params.push(filters.businessType)
      paramIndex++
    }

    if (filters.cuisine) {
      conditions.push(`$${paramIndex} = ANY(cuisine_types)`)
      params.push(filters.cuisine)
      paramIndex++
    }

    if (filters.state) {
      conditions.push(`${CANONICAL_STATE_SQL} = $${paramIndex}`)
      params.push(normalizedStateFilter)
      paramIndex++
    }

    if (filters.city) {
      conditions.push(`city ILIKE $${paramIndex}`)
      params.push(`%${filters.city}%`)
      paramIndex++
    }

    if (filters.priceRange) {
      conditions.push(`price_range = $${paramIndex}`)
      params.push(filters.priceRange)
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')

    // Count query
    const countResult = await pgClient.unsafe(
      `SELECT count(*) as count FROM directory_listings WHERE ${whereClause}`,
      params
    )
    const total = parseInt(countResult[0].count)
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

    // Data query
    const dataResult = await pgClient.unsafe(
      `SELECT id, name, slug, city, ${CANONICAL_STATE_SQL} as state, cuisine_types, business_type, website_url,
              status, price_range, featured, description, photo_urls, phone, address,
              lat, lon, lead_score
       FROM directory_listings
       WHERE ${whereClause}
       ORDER BY featured DESC, (CASE WHEN photo_urls IS NOT NULL AND array_length(photo_urls, 1) > 0 THEN 0 ELSE 1 END), lead_score DESC NULLS LAST, name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, ITEMS_PER_PAGE, offset]
    )

    return {
      listings: dataResult as unknown as DirectoryListingSummary[],
      total,
      page,
      totalPages,
    }
  } catch (err) {
    console.error('[getDirectoryListings]', err)
    return { listings: [], total: 0, page: 1, totalPages: 1 }
  }
}

export async function getDirectoryListingBySlug(slug: string): Promise<DirectoryListing | null> {
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('directory_listings')
    .select('*')
    .eq('slug', slug)
    .neq('status', 'removed')
    .single()

  if (error || !data) {
    return null
  }

  return {
    ...(data as DirectoryListing),
    state: normalizeUsStateCode(data.state) ?? data.state,
  }
}

export async function getDirectoryFacets(): Promise<{
  businessTypes: { value: string; count: number }[]
  cuisines: { value: string; count: number }[]
  states: { value: string; count: number }[]
}> {
  try {
    const [typeRows, stateRows] = await Promise.all([
      pgClient`
        SELECT business_type as value, count(*)::int as count
        FROM directory_listings
        WHERE status IN ('discovered', 'claimed', 'verified')
        GROUP BY business_type
        ORDER BY count DESC
      `,
      pgClient`
        SELECT canonical_state as value, count(*)::int as count
        FROM (
          SELECT ${pgClient.unsafe(CANONICAL_STATE_SQL)} as canonical_state
          FROM directory_listings
          WHERE status IN ('discovered', 'claimed', 'verified')
        ) states
        WHERE canonical_state IS NOT NULL
        GROUP BY canonical_state
        ORDER BY canonical_state
      `,
    ])

    // Cuisine facets need unnest since it's an array column
    const cuisineRows = await pgClient`
      SELECT c as value, count(*)::int as count
      FROM directory_listings, unnest(cuisine_types) as c
      WHERE status IN ('discovered', 'claimed', 'verified')
      GROUP BY c
      ORDER BY count DESC
    `

    return {
      businessTypes: typeRows as unknown as { value: string; count: number }[],
      cuisines: cuisineRows as unknown as { value: string; count: number }[],
      states: stateRows as unknown as { value: string; count: number }[],
    }
  } catch (err) {
    console.error('[getDirectoryFacets]', err)
    return { businessTypes: [], cuisines: [], states: [] }
  }
}

// ─── Directory Stats (for landing page) ──────────────────────────────────────

export async function getDirectoryStats(): Promise<{
  totalListings: number
  states: { state: string; count: number }[]
  topCities: { city: string; state: string; count: number }[]
}> {
  try {
    const BASE_WHERE = "status IN ('discovered', 'claimed', 'verified')"
    const [totalResult, stateResults, cityResults] = await Promise.all([
      pgClient.unsafe(
        `SELECT count(*)::int as count FROM directory_listings
         WHERE ${BASE_WHERE}`
      ),
      pgClient.unsafe(
        `SELECT canonical_state as state, count(*)::int as count
         FROM (
           SELECT ${CANONICAL_STATE_SQL} as canonical_state
           FROM directory_listings
           WHERE ${BASE_WHERE}
         ) states
         WHERE canonical_state IS NOT NULL
         GROUP BY canonical_state
         ORDER BY canonical_state`
      ),
      pgClient.unsafe(
        `SELECT city, canonical_state as state, count(*)::int as count
         FROM (
           SELECT city, ${CANONICAL_STATE_SQL} as canonical_state
           FROM directory_listings
           WHERE ${BASE_WHERE} AND city IS NOT NULL AND city != 'unknown'
         ) cities
         WHERE canonical_state IS NOT NULL
         GROUP BY city, canonical_state
         ORDER BY count DESC
         LIMIT 20`
      ),
    ])

    return {
      totalListings: totalResult[0]?.count || 0,
      states: stateResults as unknown as { state: string; count: number }[],
      topCities: cityResults as unknown as { city: string; state: string; count: number }[],
    }
  } catch (err) {
    console.error('[getDirectoryStats]', err)
    return { totalListings: 0, states: [], topCities: [] }
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

  const db = createServerClient({ admin: true })

  const baseSlug = slugify(`${input.name}-${input.city || 'us'}`)

  // Ensure unique slug
  const { data: existing } = await db
    .from('directory_listings')
    .select('slug')
    .like('slug', `${baseSlug}%`)

  let slug = baseSlug
  if (existing && existing.length > 0) {
    slug = `${baseSlug}-${existing.length + 1}`
  }

  const { error } = await db.from('directory_listings').insert({
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

  // Non-blocking: send welcome email to the submitter
  try {
    // Fetch the inserted listing to get the ID
    const { data: inserted } = await db
      .from('directory_listings')
      .select('id')
      .eq('slug', slug)
      .single()

    if (inserted) {
      sendDirectoryWelcomeEmail({
        listingId: inserted.id,
        businessName: input.name.trim(),
        businessType: input.businessType,
        slug,
        recipientEmail: input.email.trim(),
      }).catch((err) => console.error('[non-blocking] Welcome email failed', err))
    }
  } catch (err) {
    console.error('[non-blocking] Welcome email setup failed', err)
  }

  revalidatePath('/nearby')
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

  const db = createServerClient({ admin: true })

  const { error } = await db.from('directory_nominations').insert({
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

  const db = createServerClient({ admin: true })

  // Check listing exists and isn't already claimed
  const { data: listing } = await db
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

  const { error } = await db
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

  // Non-blocking: send claimed email
  try {
    // Need slug for the email link
    const { data: updated } = await db
      .from('directory_listings')
      .select('slug, name')
      .eq('id', input.listingId)
      .single()

    if (updated) {
      sendDirectoryClaimedEmail({
        listingId: input.listingId,
        businessName: (updated as any).name,
        claimerName: input.name.trim(),
        slug: (updated as any).slug,
        recipientEmail: input.email.trim(),
      }).catch((err) => console.error('[non-blocking] Claimed email failed', err))
    }
  } catch (err) {
    console.error('[non-blocking] Claimed email setup failed', err)
  }

  revalidatePath('/nearby')
  return { success: true }
}

/**
 * Claim a listing by fuzzy matching on business name + city + state.
 * Used by the /discover/join page (outreach funnel).
 * Public (no auth) - operators clicking from invitation email are not logged in.
 */
export async function claimListingByMatch(input: {
  businessName: string
  email: string
  city: string
  state?: string
  phone?: string
  website?: string
  ref?: string
}): Promise<{
  success: boolean
  listingId?: string
  slug?: string
  isNew?: boolean
  error?: string
}> {
  if (!input.businessName.trim() || !input.email.trim()) {
    return { success: false, error: 'Business name and email are required.' }
  }

  const db = createServerClient({ admin: true })

  // Step 1: If ref param exists, try to decrypt to listing ID
  if (input.ref) {
    const { decryptRef } = await import('./outreach-crypto')
    const listingId = decryptRef(input.ref)
    if (listingId) {
      const { data: listing } = await db
        .from('directory_listings')
        .select('id, status, slug')
        .eq('id', listingId)
        .maybeSingle()

      if (listing && (listing as any).status === 'discovered') {
        const result = await requestListingClaim({
          listingId: (listing as any).id,
          name: input.businessName.trim(),
          email: input.email.trim(),
          phone: input.phone,
        })
        if (result.success) {
          // Mark outreach status
          await db
            .from('directory_listings')
            .update({
              outreach_status: 'claimed_via_outreach',
            })
            .eq('id', (listing as any).id)
          return { success: true, listingId: (listing as any).id, slug: (listing as any).slug }
        }
      }
    }
  }

  // Step 2: Tier 1 - Exact name + city + state match
  const name = input.businessName.trim()
  const city = input.city.trim()
  const state = input.state?.trim() || null

  let matchQuery = db
    .from('directory_listings')
    .select('id, name, slug, lead_score')
    .eq('status', 'discovered')
    .ilike('name', name)
    .ilike('city', city)

  if (state) matchQuery = matchQuery.eq('state', state)

  const { data: exactMatches } = await matchQuery.limit(5)

  if (exactMatches && exactMatches.length === 1) {
    const match = exactMatches[0] as any
    const result = await requestListingClaim({
      listingId: match.id,
      name: input.businessName.trim(),
      email: input.email.trim(),
      phone: input.phone,
    })
    if (result.success) {
      await db
        .from('directory_listings')
        .update({
          outreach_status: 'claimed_via_outreach',
        })
        .eq('id', match.id)
      return { success: true, listingId: match.id, slug: match.slug }
    }
  }

  // Step 3: Tier 2 - Loose match (strip apostrophes, case-insensitive)
  const looseName = name.replace(/'/g, '')
  let looseQuery = db
    .from('directory_listings')
    .select('id, name, slug, lead_score')
    .eq('status', 'discovered')
    .ilike('city', city)

  if (state) looseQuery = looseQuery.eq('state', state)

  const { data: looseMatches } = await looseQuery.limit(50)

  if (looseMatches) {
    const filtered = (looseMatches as any[]).filter(
      (m: any) => m.name.replace(/'/g, '').toLowerCase() === looseName.toLowerCase()
    )
    if (filtered.length > 0) {
      // Pick highest lead_score
      filtered.sort((a: any, b: any) => (b.lead_score ?? 0) - (a.lead_score ?? 0))
      const match = filtered[0]
      const result = await requestListingClaim({
        listingId: match.id,
        name: input.businessName.trim(),
        email: input.email.trim(),
        phone: input.phone,
      })
      if (result.success) {
        await db
          .from('directory_listings')
          .update({
            outreach_status: 'claimed_via_outreach',
          })
          .eq('id', match.id)
        return { success: true, listingId: match.id, slug: match.slug }
      }
    }
  }

  // Step 4: Tier 3 - No match. Create a new pending_submission listing.
  const slug = slugify(name) + '-' + city.toLowerCase().replace(/\s+/g, '-')

  const { data: newListing, error: insertError } = await db
    .from('directory_listings')
    .insert({
      name: name,
      slug,
      city,
      state,
      email: input.email.trim(),
      phone: input.phone || null,
      website_url: input.website || null,
      business_type: 'restaurant',
      status: 'pending_submission',
      source: 'outreach_join',
    })
    .select('id, slug')
    .single()

  if (insertError) {
    console.error('[claimListingByMatch] Insert failed:', insertError)
    return { success: false, error: 'Failed to create listing.' }
  }

  return {
    success: true,
    listingId: (newListing as any)?.id,
    slug: (newListing as any)?.slug,
    isNew: true,
  }
}

export async function requestListingRemoval(input: {
  listingId: string
  reason: string
  email: string
}): Promise<{ success: boolean; error?: string }> {
  if (!input.reason.trim() || !input.email.trim()) {
    return { success: false, error: 'Reason and email are required.' }
  }

  const db = createServerClient({ admin: true })

  const { error } = await db
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
  const db = createServerClient({ admin: true })

  const { data, error } = await db
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
  const db = createServerClient({ admin: true })

  const updates: Record<string, any> = { status }
  if (status === 'removed') {
    updates.removed_at = new Date().toISOString()
  }

  // Fetch listing details before update (for email)
  const { data: listingBefore } = await db
    .from('directory_listings')
    .select('name, slug, claimed_by_email, email')
    .eq('id', listingId)
    .single()

  const { error } = await db.from('directory_listings').update(updates).eq('id', listingId)

  if (error) {
    console.error('[adminUpdateListingStatus]', error)
    return { success: false, error: 'Failed to update status.' }
  }

  // Non-blocking: send verified email when status changes to verified
  if (status === 'verified' && listingBefore) {
    const recipientEmail = (listingBefore as any).claimed_by_email || (listingBefore as any).email
    if (recipientEmail) {
      sendDirectoryVerifiedEmail({
        listingId,
        businessName: (listingBefore as any).name,
        slug: (listingBefore as any).slug,
        recipientEmail,
      }).catch((err) => console.error('[non-blocking] Verified email failed', err))
    }
  }

  revalidatePath('/nearby')
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

  const db = createServerClient({ admin: true })

  const baseSlug = slugify(`${input.name}-${input.city || 'us'}`)

  const { data: existing } = await db
    .from('directory_listings')
    .select('slug')
    .like('slug', `${baseSlug}%`)

  let slug = baseSlug
  if (existing && existing.length > 0) {
    slug = `${baseSlug}-${existing.length + 1}`
  }

  const { error } = await db.from('directory_listings').insert({
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

  revalidatePath('/nearby')
  revalidatePath('/admin/directory-listings')
  return { success: true, slug }
}

// ─── Profile Enhancement (Claimed Listings) ──────────────────────────────────

export async function enhanceDirectoryListing(input: {
  listingId: string
  description?: string
  address?: string
  phone?: string
  menuUrl?: string
  hours?: Record<string, string>
}): Promise<{ success: boolean; error?: string }> {
  const db = createServerClient({ admin: true })

  // Verify listing exists and is claimed/verified
  const { data: listing } = await db
    .from('directory_listings')
    .select('id, status')
    .eq('id', input.listingId)
    .single()

  if (!listing) {
    return { success: false, error: 'Listing not found.' }
  }

  if (listing.status !== 'claimed' && listing.status !== 'verified') {
    return { success: false, error: 'Only claimed listings can be enhanced.' }
  }

  const updates: Record<string, any> = {}
  if (input.description !== undefined) updates.description = input.description.trim() || null
  if (input.address !== undefined) updates.address = input.address.trim() || null
  if (input.phone !== undefined) updates.phone = input.phone.trim() || null
  if (input.menuUrl !== undefined) updates.menu_url = input.menuUrl.trim() || null
  if (input.hours !== undefined) updates.hours = input.hours

  if (Object.keys(updates).length === 0) {
    return { success: true }
  }

  const { error } = await db.from('directory_listings').update(updates).eq('id', input.listingId)

  if (error) {
    console.error('[enhanceDirectoryListing]', error)
    return { success: false, error: 'Failed to update listing.' }
  }

  revalidatePath('/nearby')
  return { success: true }
}

export async function adminGetNominations(): Promise<any[]> {
  const db = createServerClient({ admin: true })

  const { data, error } = await db
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
  const db = createServerClient({ admin: true })

  const { error } = await db
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
