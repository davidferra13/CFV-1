'use server'

// Partner Portal Server Actions
// All actions require the user to be an authenticated partner (via requirePartner()).
// Uses admin client for DB reads to bypass chef-only RLS on the data,
// but ALWAYS validates via requirePartner() first - the admin client is never
// a shortcut around authentication, only around RLS scoping.

import { requirePartner } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import {
  getPartnerLocationProposalChangedFields,
  sanitizePartnerLocationProposal,
  type PartnerLocationProposalInput,
  type PartnerLocationChangeRequestStatus,
} from '@/lib/partners/location-change-requests'

// ─── Types ───────────────────────────────────────────────────────────────────

export type PartnerLocation = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  booking_url: string | null
  description: string | null
  max_guest_count: number | null
  experience_tags: string[]
  best_for: string[]
  service_types: string[]
  is_active: boolean
  partner_images: PartnerImage[]
}

export type PartnerImage = {
  id: string
  image_url: string
  caption: string | null
  season: string | null
  display_order: number | null
  location_id: string | null
}

export type PartnerEvent = {
  id: string
  event_date: string
  occasion: string | null
  guest_count: number | null
  status: string
  partner_location_id: string | null
}

export type PartnerStats = {
  totalLocations: number
  totalEvents: number
  totalGuests: number
  totalPhotos: number
}

export type PartnerLocationChangeRequestRecord = {
  id: string
  location_id: string
  status: PartnerLocationChangeRequestStatus
  requested_payload: PartnerLocationProposalInput
  partner_note: string | null
  review_note: string | null
  created_at: string
  reviewed_at: string | null
}

export type PartnerRecentActivityItem = {
  id: string
  locationName: string
  status: PartnerLocationChangeRequestStatus
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}

export type PartnerPortalData = {
  partner: {
    id: string
    name: string
    description: string | null
    contact_name: string | null
    email: string | null
    phone: string | null
    website: string | null
    booking_url: string | null
    cover_image_url: string | null
    is_showcase_visible: boolean
    acquisition_source: string | null
    origin_client_id: string | null
    origin_event_id: string | null
    claimed_at: string | null
  }
  locations: PartnerLocation[]
  allImages: PartnerImage[]
  recentEvents: PartnerEvent[]
  recentActivity: PartnerRecentActivityItem[]
  stats: PartnerStats
  originClientName: string | null
  originEventSummary: string | null
}

async function fetchPartnerPortalRecord(
  db: any,
  partnerId: string
): Promise<Pick<PartnerPortalData, 'partner' | 'locations' | 'allImages'>> {
  const { data: partnerRecord, error: partnerError } = await db
    .from('referral_partners')
    .select(
      [
        'id',
        'name',
        'description',
        'contact_name',
        'email',
        'phone',
        'website',
        'booking_url',
        'cover_image_url',
        'is_showcase_visible',
        'acquisition_source',
        'origin_client_id',
        'origin_event_id',
        'claimed_at',
      ].join(', ')
    )
    .eq('id', partnerId)
    .single()

  if (partnerError || !partnerRecord) {
    throw new Error('Failed to load partner data')
  }

  const [
    { data: locationRecords, error: locationError },
    { data: imageRecords, error: imageError },
  ] = await Promise.all([
    db
      .from('partner_locations')
      .select(
        [
          'id',
          'name',
          'address',
          'city',
          'state',
          'zip',
          'booking_url',
          'description',
          'max_guest_count',
          'experience_tags',
          'best_for',
          'service_types',
          'is_active',
        ].join(', ')
      )
      .eq('partner_id', partnerId)
      .order('name', { ascending: true }),
    db
      .from('partner_images')
      .select('id, image_url, caption, season, display_order, location_id')
      .eq('partner_id', partnerId)
      .order('display_order', { ascending: true }),
  ])

  if (locationError) {
    throw new Error('Failed to load partner locations')
  }

  if (imageError) {
    throw new Error('Failed to load partner images')
  }

  const allImages: PartnerImage[] = ((imageRecords as PartnerImage[] | null) ?? []).sort(
    (a, b) =>
      (a.display_order ?? Number.MAX_SAFE_INTEGER) - (b.display_order ?? Number.MAX_SAFE_INTEGER) ||
      a.id.localeCompare(b.id)
  )

  const imagesByLocationId = new Map<string, PartnerImage[]>()
  for (const image of allImages) {
    if (!image.location_id) continue

    const existing = imagesByLocationId.get(image.location_id) ?? []
    existing.push(image)
    imagesByLocationId.set(image.location_id, existing)
  }

  const locations: PartnerLocation[] = ((locationRecords as any[]) ?? []).map((location) => ({
    id: location.id,
    name: location.name,
    address: location.address ?? null,
    city: location.city ?? null,
    state: location.state ?? null,
    zip: location.zip ?? null,
    booking_url: location.booking_url ?? null,
    description: location.description ?? null,
    max_guest_count: location.max_guest_count ?? null,
    experience_tags: Array.isArray(location.experience_tags) ? location.experience_tags : [],
    best_for: Array.isArray(location.best_for) ? location.best_for : [],
    service_types: Array.isArray(location.service_types) ? location.service_types : [],
    is_active: location.is_active ?? true,
    partner_images: (imagesByLocationId.get(location.id) ?? []).slice(),
  }))

  return {
    partner: partnerRecord as PartnerPortalData['partner'],
    locations,
    allImages,
  }
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Fetch everything the partner needs to render their dashboard and pages.
 * Returns aggregate stats, all locations with images, and recent events.
 * No client PII is returned - events show only occasion, date, guest count, status.
 */
export async function getPartnerPortalData(): Promise<PartnerPortalData> {
  const user = await requirePartner()
  const db = createServerClient({ admin: true })

  const { partner, locations, allImages } = await fetchPartnerPortalRecord(db, user.partnerId)
  const activeLocations = locations.filter((l) => l.is_active)
  const locationIds = activeLocations.map((l) => l.id)

  // Fetch events at this partner's locations (no client PII - privacy by design)
  let recentEvents: PartnerEvent[] = []
  if (locationIds.length > 0) {
    const { data: eventsData } = await db
      .from('events')
      .select('id, event_date, occasion, guest_count, status, partner_location_id')
      .in('partner_location_id', locationIds)
      .in('status', ['confirmed', 'in_progress', 'completed'])
      .order('event_date', { ascending: false })
      .limit(50)

    recentEvents = (eventsData as PartnerEvent[]) || []
  }

  // Aggregate stats - only completed events count toward guests served
  const completedEvents = recentEvents.filter((e) => e.status === 'completed')
  const totalGuests = completedEvents.reduce((sum, e) => sum + (e.guest_count ?? 0), 0)

  const stats: PartnerStats = {
    totalLocations: activeLocations.length,
    totalEvents: completedEvents.length,
    totalGuests,
    totalPhotos: allImages.length,
  }

  // Fetch origin story details (client name + event summary) if set
  let originClientName: string | null = null
  let originEventSummary: string | null = null

  if (partner.origin_client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', partner.origin_client_id)
      .single()
    originClientName = (client as any)?.full_name ?? null
  }

  // Fetch recent change request activity (approved/rejected requests for the activity feed)
  let recentActivity: PartnerRecentActivityItem[] = []
  {
    const { data: changeRequests } = await db
      .from('partner_location_change_requests')
      .select('id, location_id, status, review_note, reviewed_at, created_at')
      .eq('partner_id', user.partnerId)
      .in('status', ['approved', 'rejected'])
      .order('reviewed_at', { ascending: false })
      .limit(10)

    if (changeRequests && changeRequests.length > 0) {
      const locationNameMap = Object.fromEntries(locations.map((l) => [l.id, l.name]))
      recentActivity = (changeRequests as any[]).map((cr) => ({
        id: cr.id,
        locationName: locationNameMap[cr.location_id] ?? 'Unknown location',
        status: cr.status as PartnerLocationChangeRequestStatus,
        reviewNote: cr.review_note ?? null,
        reviewedAt: cr.reviewed_at ?? null,
        createdAt: cr.created_at,
      }))
    }
  }

  if (partner.origin_event_id) {
    const { data: originEvent } = await db
      .from('events')
      .select('event_date, occasion')
      .eq('id', partner.origin_event_id)
      .single()
    if (originEvent) {
      originEventSummary = `${originEvent.occasion || 'Event'} in ${new Date(originEvent.event_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    }
  }

  return {
    partner,
    locations,
    allImages,
    recentEvents,
    recentActivity,
    stats,
    originClientName,
    originEventSummary,
  }
}

/**
 * Fetch events for a specific location. Used on the location detail page.
 */
export async function getPartnerLocationEvents(locationId: string): Promise<PartnerEvent[]> {
  const user = await requirePartner()
  const db = createServerClient({ admin: true })

  // Verify this location belongs to the requesting partner
  const { data: loc } = await db
    .from('partner_locations')
    .select('id, partner_id')
    .eq('id', locationId)
    .eq('partner_id', user.partnerId)
    .single()

  if (!loc) throw new Error('Location not found or access denied')

  const { data: events } = await db
    .from('events')
    .select('id, event_date, occasion, guest_count, status, partner_location_id')
    .eq('partner_location_id', locationId)
    .in('status', ['confirmed', 'in_progress', 'completed'])
    .order('event_date', { ascending: false })

  return (events as PartnerEvent[]) || []
}

export async function getPartnerLocationChangeRequests(
  locationId: string
): Promise<PartnerLocationChangeRequestRecord[]> {
  const user = await requirePartner()
  const db: any = createServerClient({ admin: true })

  const { data: loc } = await db
    .from('partner_locations')
    .select('id')
    .eq('id', locationId)
    .eq('partner_id', user.partnerId)
    .single()

  if (!loc) throw new Error('Location not found or access denied')

  const { data, error } = await db
    .from('partner_location_change_requests')
    .select(
      'id, location_id, status, requested_payload, partner_note, review_note, created_at, reviewed_at'
    )
    .eq('partner_id', user.partnerId)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Failed to load location change requests')
  }

  return (data as PartnerLocationChangeRequestRecord[]) || []
}

// ─── Write ───────────────────────────────────────────────────────────────────

/**
 * Update the partner's own profile fields (name, description, contact info).
 * The chef controls is_showcase_visible - partners cannot change it themselves.
 */
export async function updatePartnerProfile(input: {
  name?: string
  description?: string
  contact_name?: string
  phone?: string
  website?: string
  booking_url?: string
  cover_image_url?: string
}): Promise<{ success: true }> {
  const user = await requirePartner()
  const db = createServerClient({ admin: true })

  // Whitelist - never allow partners to change tenant_id, auth_user_id, is_showcase_visible, etc.
  const allowed = {
    name: input.name,
    description: input.description,
    contact_name: input.contact_name,
    phone: input.phone,
    website: input.website,
    booking_url: input.booking_url,
    cover_image_url: input.cover_image_url,
  }
  // Strip undefined fields
  const update = Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined))

  const { error } = await db.from('referral_partners').update(update).eq('id', user.partnerId)

  if (error) throw new Error('Failed to update profile')
  return { success: true }
}

/**
 * Update a location's public-facing description (caption, notes).
 * Partners cannot change tenant_id, partner_id, or is_active.
 */
export async function updatePartnerLocationDescription(
  locationId: string,
  description: string
): Promise<{ success: true }> {
  const user = await requirePartner()
  const db = createServerClient({ admin: true })

  // Verify ownership
  const { data: loc } = await db
    .from('partner_locations')
    .select('id')
    .eq('id', locationId)
    .eq('partner_id', user.partnerId)
    .single()

  if (!loc) throw new Error('Location not found')

  await db.from('partner_locations').update({ description }).eq('id', locationId)

  return { success: true }
}

export async function requestPartnerLocationChange(
  locationId: string,
  input: PartnerLocationProposalInput & { partnerNote?: string | null }
): Promise<{ success: true }> {
  const user = await requirePartner()
  const db: any = createServerClient({ admin: true })

  const { data: location } = await db
    .from('partner_locations')
    .select(
      `
      id,
      name,
      address,
      city,
      state,
      zip,
      booking_url,
      description,
      max_guest_count,
      experience_tags,
      best_for,
      service_types
    `
    )
    .eq('id', locationId)
    .eq('partner_id', user.partnerId)
    .single()

  if (!location) throw new Error('Location not found')

  const { data: pendingRequest } = await db
    .from('partner_location_change_requests')
    .select('id')
    .eq('partner_id', user.partnerId)
    .eq('location_id', locationId)
    .eq('status', 'pending')
    .maybeSingle()

  if (pendingRequest) {
    throw new Error('There is already a pending location update request for this setting.')
  }

  const proposal = sanitizePartnerLocationProposal(input)
  const changedFields = getPartnerLocationProposalChangedFields(location, proposal)

  if (changedFields.length === 0) {
    throw new Error('No public location changes were detected.')
  }

  const { error } = await db.from('partner_location_change_requests').insert({
    tenant_id: user.tenantId,
    partner_id: user.partnerId,
    location_id: locationId,
    status: 'pending',
    requested_payload: proposal,
    partner_note: input.partnerNote?.trim() || null,
    requested_by_auth_user_id: user.id,
  })

  if (error) {
    throw new Error('Failed to submit location update request')
  }

  revalidatePath('/partner/locations')
  revalidatePath(`/partner/locations/${locationId}`)
  revalidatePath(`/partners/${user.partnerId}`)

  return { success: true }
}
