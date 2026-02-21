'use server'

// Partner Portal Server Actions
// All actions require the user to be an authenticated partner (via requirePartner()).
// Uses admin client for DB reads to bypass chef-only RLS on the data,
// but ALWAYS validates via requirePartner() first — the admin client is never
// a shortcut around authentication, only around RLS scoping.

import { requirePartner } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export type PartnerLocation = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  description: string | null
  max_guest_count: number | null
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
  stats: PartnerStats
  originClientName: string | null
  originEventSummary: string | null
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Fetch everything the partner needs to render their dashboard and pages.
 * Returns aggregate stats, all locations with images, and recent events.
 * No client PII is returned — events show only occasion, date, guest count, status.
 */
export async function getPartnerPortalData(): Promise<PartnerPortalData> {
  const user = await requirePartner()
  const supabase = createServerClient({ admin: true })

  // Fetch partner record with nested locations + images
  const { data: partnerRecord, error } = await supabase
    .from('referral_partners')
    .select(
      `
      id, name, description, contact_name, email, phone, website, booking_url,
      cover_image_url, is_showcase_visible, acquisition_source,
      origin_client_id, origin_event_id, claimed_at,
      partner_locations(
        id, name, address, city, state, zip, description, max_guest_count, is_active,
        partner_images(id, image_url, caption, season, display_order, location_id)
      ),
      partner_images!partner_images_partner_id_fkey(
        id, image_url, caption, season, display_order, location_id
      )
    `
    )
    .eq('id', user.partnerId)
    .single()

  if (error || !partnerRecord) {
    throw new Error('Failed to load partner data')
  }

  const record = partnerRecord as any
  const locations: PartnerLocation[] = (record.partner_locations as any[]) || []
  const allImages: PartnerImage[] = (record.partner_images as any[]) || []
  const activeLocations = locations.filter((l) => l.is_active)
  const locationIds = activeLocations.map((l) => l.id)

  // Fetch events at this partner's locations (no client PII — privacy by design)
  let recentEvents: PartnerEvent[] = []
  if (locationIds.length > 0) {
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, event_date, occasion, guest_count, status, partner_location_id')
      .in('partner_location_id', locationIds)
      .in('status', ['confirmed', 'in_progress', 'completed'])
      .order('event_date', { ascending: false })
      .limit(50)

    recentEvents = (eventsData as PartnerEvent[]) || []
  }

  // Aggregate stats — only completed events count toward guests served
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

  if (record.origin_client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('full_name')
      .eq('id', record.origin_client_id)
      .single()
    originClientName = (client as any)?.full_name ?? null
  }

  if (record.origin_event_id) {
    const { data: originEvent } = await supabase
      .from('events')
      .select('event_date, occasion')
      .eq('id', record.origin_event_id)
      .single()
    if (originEvent) {
      originEventSummary = `${originEvent.occasion || 'Event'} in ${new Date(originEvent.event_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    }
  }

  return {
    partner: record,
    locations,
    allImages,
    recentEvents,
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
  const supabase = createServerClient({ admin: true })

  // Verify this location belongs to the requesting partner
  const { data: loc } = await supabase
    .from('partner_locations')
    .select('id, partner_id')
    .eq('id', locationId)
    .eq('partner_id', user.partnerId)
    .single()

  if (!loc) throw new Error('Location not found or access denied')

  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, occasion, guest_count, status, partner_location_id')
    .eq('partner_location_id', locationId)
    .in('status', ['confirmed', 'in_progress', 'completed'])
    .order('event_date', { ascending: false })

  return (events as PartnerEvent[]) || []
}

// ─── Write ───────────────────────────────────────────────────────────────────

/**
 * Update the partner's own profile fields (name, description, contact info).
 * The chef controls is_showcase_visible — partners cannot change it themselves.
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
  const supabase = createServerClient({ admin: true })

  // Whitelist — never allow partners to change tenant_id, auth_user_id, is_showcase_visible, etc.
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

  const { error } = await supabase.from('referral_partners').update(update).eq('id', user.partnerId)

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
  const supabase = createServerClient({ admin: true })

  // Verify ownership
  const { data: loc } = await supabase
    .from('partner_locations')
    .select('id')
    .eq('id', locationId)
    .eq('partner_id', user.partnerId)
    .single()

  if (!loc) throw new Error('Location not found')

  await supabase.from('partner_locations').update({ description }).eq('id', locationId)

  return { success: true }
}
