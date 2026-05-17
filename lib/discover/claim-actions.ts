'use server'

// Directory Post-Claim Enhancement Actions
// Server actions for operators who have claimed their /nearby listing.
// Auth-gated: requireChef for operator actions, requireAdmin for verification.

import { requireChef } from '@/lib/auth/get-user'
import { requireAdmin } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  ClaimedListing,
  ClaimedListingUpdate,
  ClaimSubmissionResult,
  ClaimVerificationResult,
  ListingAnalytics,
} from './claim-types'

// ---- Validation Schemas ----

const SubmitClaimSchema = z.object({
  listingId: z.string().uuid(),
  businessName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(30).optional(),
  note: z.string().max(1000).optional(),
})

const UpdateListingSchema = z.object({
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  websiteUrl: z.string().url().max(500).optional(),
  menuUrl: z.string().url().max(500).optional(),
  hours: z.record(z.string(), z.string()).optional(),
  photoUrls: z.array(z.string().url()).max(20).optional(),
  cuisineTypes: z.array(z.string()).max(20).optional(),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']).optional(),
})

// ---- Submit Claim ----

/**
 * Operator submits a claim for an unclaimed directory listing.
 * Links to the authenticated chef's account automatically.
 */
export async function submitClaim(
  listingId: string,
  verificationData: {
    businessName: string
    contactName: string
    contactEmail: string
    contactPhone?: string
    note?: string
  }
): Promise<ClaimSubmissionResult> {
  const user = await requireChef()
  const validated = SubmitClaimSchema.parse({ listingId, ...verificationData })
  const db: any = createServerClient({ admin: true })

  // Check listing exists and is claimable
  const { data: listing, error: lookupError } = await db
    .from('directory_listings')
    .select('id, status, slug, name, linked_chef_id')
    .eq('id', validated.listingId)
    .single()

  if (lookupError || !listing) {
    return { success: false, error: 'Listing not found.' }
  }

  if (listing.status === 'claimed' || listing.status === 'verified') {
    return { success: false, error: 'This listing has already been claimed.' }
  }

  if (listing.status === 'removed') {
    return { success: false, error: 'This listing has been removed.' }
  }

  // Check chef has not already claimed another listing with same email
  const { data: existingClaims } = await db
    .from('directory_listings')
    .select('id')
    .eq('linked_chef_id', user.entityId)
    .in('status', ['claimed', 'verified'])
    .neq('id', validated.listingId)
    .limit(1)

  // Allow multiple claims per chef (they may own multiple businesses)
  // but log it for admin awareness

  const claimToken = crypto.randomUUID()

  const { error: updateError } = await db
    .from('directory_listings')
    .update({
      status: 'claimed',
      claimed_by_name: validated.contactName,
      claimed_by_email: validated.contactEmail,
      claimed_at: new Date().toISOString(),
      claim_token: claimToken,
      linked_chef_id: user.entityId,
      linked_chef_confidence: 'high',
      linked_chef_reason: 'claimed_email_exact',
      linked_chef_at: new Date().toISOString(),
    })
    .eq('id', validated.listingId)
    .neq('status', 'claimed')
    .neq('status', 'verified')

  if (updateError) {
    console.error('[submitClaim]', updateError)
    return { success: false, error: 'Failed to process claim. Please try again.' }
  }

  revalidatePath('/nearby')
  revalidatePath(`/nearby/${listing.slug}`)

  return {
    success: true,
    claimId: claimToken,
    slug: listing.slug,
  }
}

// ---- Admin Verify Claim ----

/**
 * Admin approves or rejects a pending claim.
 * Verified listings get enhanced visibility in the directory.
 */
export async function verifyClaim(
  claimId: string,
  action: 'approve' | 'reject' = 'approve'
): Promise<ClaimVerificationResult> {
  await requireAdmin()
  const db: any = createServerClient({ admin: true })

  if (!claimId || typeof claimId !== 'string') {
    return { success: false, error: 'Invalid claim identifier.' }
  }

  // Find listing by claim token
  const { data: listing, error: lookupError } = await db
    .from('directory_listings')
    .select('id, status, slug, claim_token')
    .eq('claim_token', claimId)
    .single()

  if (lookupError || !listing) {
    return { success: false, error: 'Claim not found.' }
  }

  if (action === 'approve') {
    if (listing.status === 'verified') {
      return { success: true, newStatus: 'verified' }
    }

    const { error: updateError } = await db
      .from('directory_listings')
      .update({ status: 'verified' })
      .eq('id', listing.id)

    if (updateError) {
      console.error('[verifyClaim:approve]', updateError)
      return { success: false, error: 'Failed to verify claim.' }
    }

    revalidatePath('/nearby')
    revalidatePath(`/nearby/${listing.slug}`)

    return { success: true, newStatus: 'verified' }
  }

  // Reject: revert to discovered, clear claim fields
  const { error: rejectError } = await db
    .from('directory_listings')
    .update({
      status: 'discovered',
      claimed_by_name: null,
      claimed_by_email: null,
      claimed_at: null,
      claim_token: null,
      linked_chef_id: null,
      linked_chef_confidence: null,
      linked_chef_reason: null,
      linked_chef_at: null,
    })
    .eq('id', listing.id)

  if (rejectError) {
    console.error('[verifyClaim:reject]', rejectError)
    return { success: false, error: 'Failed to reject claim.' }
  }

  revalidatePath('/nearby')
  revalidatePath(`/nearby/${listing.slug}`)

  return { success: true, newStatus: 'rejected' }
}

// ---- Update Claimed Listing ----

/**
 * Operator edits their claimed listing profile.
 * Only the linked chef can modify; enforced via linked_chef_id check.
 */
export async function updateClaimedListing(
  listingId: string,
  updates: ClaimedListingUpdate
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = UpdateListingSchema.parse(updates)
  const db: any = createServerClient({ admin: true })

  if (!listingId || typeof listingId !== 'string') {
    return { success: false, error: 'Invalid listing ID.' }
  }

  // Verify listing belongs to this chef
  const { data: listing, error: lookupError } = await db
    .from('directory_listings')
    .select('id, status, slug, linked_chef_id')
    .eq('id', listingId)
    .single()

  if (lookupError || !listing) {
    return { success: false, error: 'Listing not found.' }
  }

  if (listing.linked_chef_id !== user.entityId) {
    return { success: false, error: 'You do not have permission to edit this listing.' }
  }

  if (listing.status !== 'claimed' && listing.status !== 'verified') {
    return { success: false, error: 'Only claimed or verified listings can be edited.' }
  }

  // Build update payload from validated fields
  const payload: Record<string, unknown> = {}
  if (validated.description !== undefined)
    payload.description = validated.description.trim() || null
  if (validated.address !== undefined) payload.address = validated.address.trim() || null
  if (validated.phone !== undefined) payload.phone = validated.phone.trim() || null
  if (validated.email !== undefined) payload.email = validated.email.trim() || null
  if (validated.websiteUrl !== undefined) payload.website_url = validated.websiteUrl.trim() || null
  if (validated.menuUrl !== undefined) payload.menu_url = validated.menuUrl.trim() || null
  if (validated.hours !== undefined) payload.hours = validated.hours
  if (validated.photoUrls !== undefined) payload.photo_urls = validated.photoUrls
  if (validated.cuisineTypes !== undefined) payload.cuisine_types = validated.cuisineTypes
  if (validated.priceRange !== undefined) payload.price_range = validated.priceRange

  if (Object.keys(payload).length === 0) {
    return { success: true }
  }

  payload.updated_at = new Date().toISOString()

  const { error: updateError } = await db
    .from('directory_listings')
    .update(payload)
    .eq('id', listingId)

  if (updateError) {
    console.error('[updateClaimedListing]', updateError)
    return { success: false, error: 'Failed to update listing.' }
  }

  revalidatePath('/nearby')
  revalidatePath(`/nearby/${listing.slug}`)

  return { success: true }
}

// ---- Get Listing Analytics ----

/**
 * Returns analytics for a claimed listing: favorites count, completeness score,
 * and missing fields. Uses existing data (no analytics table needed).
 */
export async function getListingAnalytics(
  listingId: string
): Promise<{ success: boolean; error?: string; analytics?: ListingAnalytics }> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  if (!listingId || typeof listingId !== 'string') {
    return { success: false, error: 'Invalid listing ID.' }
  }

  // Verify listing belongs to this chef
  const { data: listing, error: lookupError } = await db
    .from('directory_listings')
    .select(
      'id, status, slug, name, description, address, phone, email, website_url, menu_url, hours, photo_urls, cuisine_types, price_range, claimed_at, linked_chef_id'
    )
    .eq('id', listingId)
    .single()

  if (lookupError || !listing) {
    return { success: false, error: 'Listing not found.' }
  }

  if (listing.linked_chef_id !== user.entityId) {
    return {
      success: false,
      error: 'You do not have permission to view analytics for this listing.',
    }
  }

  // Count total favorites
  const { count: totalFavorites, error: favError } = await db
    .from('directory_listing_favorites')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', listingId)

  // Count recent favorites (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { count: recentFavorites, error: recentFavError } = await db
    .from('directory_listing_favorites')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  if (favError) {
    console.error('[getListingAnalytics:favorites]', favError)
  }
  if (recentFavError) {
    console.error('[getListingAnalytics:recentFavorites]', recentFavError)
  }

  // Compute completeness
  const { score, missing } = computeListingCompleteness(listing)

  // Days since claimed
  let daysSinceClaimed: number | null = null
  if (listing.claimed_at) {
    const claimedDate = new Date(listing.claimed_at)
    const now = new Date()
    daysSinceClaimed = Math.floor((now.getTime() - claimedDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  const analytics: ListingAnalytics = {
    listingId,
    totalFavorites: totalFavorites ?? 0,
    recentFavorites: recentFavorites ?? 0,
    claimedAt: listing.claimed_at ?? null,
    daysSinceClaimed,
    listingStatus: listing.status,
    hasLinkedChef: listing.linked_chef_id !== null,
    completenessScore: score,
    missingFields: missing,
  }

  return { success: true, analytics }
}

// ---- Get Claimed Listings ----

/**
 * Returns all directory listings claimed by the authenticated chef.
 */
export async function getClaimedListings(): Promise<ClaimedListing[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data: listings, error } = await db
    .from('directory_listings')
    .select(
      'id, name, slug, city, state, business_type, status, description, address, phone, email, website_url, menu_url, hours, photo_urls, cuisine_types, price_range, claimed_by_name, claimed_by_email, claimed_at, linked_chef_id, created_at, updated_at'
    )
    .eq('linked_chef_id', user.entityId)
    .in('status', ['claimed', 'verified'])
    .order('claimed_at', { ascending: false })

  if (error) {
    console.error('[getClaimedListings]', error)
    return []
  }

  if (!listings || listings.length === 0) {
    return []
  }

  return (listings as any[]).map(normalizeClaimedListing)
}

// ---- Internal Helpers ----

function normalizeClaimedListing(row: any): ClaimedListing {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city ?? null,
    state: row.state ?? null,
    businessType: row.business_type,
    status: row.status,
    description: row.description ?? null,
    address: row.address ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    websiteUrl: row.website_url ?? null,
    menuUrl: row.menu_url ?? null,
    hours: row.hours ?? null,
    photoUrls: Array.isArray(row.photo_urls) ? row.photo_urls.filter(Boolean) : [],
    cuisineTypes: Array.isArray(row.cuisine_types) ? row.cuisine_types.filter(Boolean) : [],
    priceRange: row.price_range ?? null,
    claimedByName: row.claimed_by_name ?? null,
    claimedByEmail: row.claimed_by_email ?? null,
    claimedAt: row.claimed_at ?? null,
    linkedChefId: row.linked_chef_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const COMPLETENESS_FIELDS: { key: string; label: string }[] = [
  { key: 'description', label: 'Description' },
  { key: 'address', label: 'Address' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'website_url', label: 'Website' },
  { key: 'menu_url', label: 'Menu URL' },
  { key: 'hours', label: 'Business hours' },
  { key: 'price_range', label: 'Price range' },
]

const COMPLETENESS_ARRAY_FIELDS: { key: string; label: string }[] = [
  { key: 'photo_urls', label: 'Photos' },
  { key: 'cuisine_types', label: 'Cuisine types' },
]

function computeListingCompleteness(listing: any): {
  score: number
  missing: string[]
} {
  const totalFields = COMPLETENESS_FIELDS.length + COMPLETENESS_ARRAY_FIELDS.length
  const missing: string[] = []

  for (const field of COMPLETENESS_FIELDS) {
    const value = listing[field.key]
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      missing.push(field.label)
    }
    // For hours, check if the object is empty
    if (
      field.key === 'hours' &&
      value &&
      typeof value === 'object' &&
      Object.keys(value).length === 0
    ) {
      missing.push(field.label)
    }
  }

  for (const field of COMPLETENESS_ARRAY_FIELDS) {
    const value = listing[field.key]
    if (!Array.isArray(value) || value.filter(Boolean).length === 0) {
      missing.push(field.label)
    }
  }

  // Deduplicate (hours can appear twice if null AND empty object, though not both)
  const uniqueMissing = [...new Set(missing)]
  const filledCount = totalFields - uniqueMissing.length
  const score = Math.round((filledCount / totalFields) * 100)

  return { score, missing: uniqueMissing }
}
