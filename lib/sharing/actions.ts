// Guest RSVP & Event Sharing Server Actions
// Handles shareable event links, guest RSVPs, and visibility controls.
// Public actions use admin client (bypass RLS) with app-layer token validation.
// Authenticated actions use standard tenant-scoped patterns.

'use server'

import { requireChef, requireClient, getCurrentUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import crypto from 'crypto'

// ============================================================
// SCHEMAS
// ============================================================

const SubmitRSVPSchema = z.object({
  shareToken: z.string().min(1),
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  rsvp_status: z.enum(['attending', 'declined', 'maybe']),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  notes: z.string().optional(),
  plus_one: z.boolean().optional(),
  photo_consent: z.boolean().optional(),
  plus_one_name: z.string().optional(),
  plus_one_allergies: z.array(z.string()).optional(),
  plus_one_dietary: z.array(z.string()).optional(),
})

const UpdateRSVPSchema = z.object({
  guestToken: z.string().min(1),
  full_name: z.string().min(1).optional(),
  rsvp_status: z.enum(['attending', 'declined', 'maybe']).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  notes: z.string().optional(),
  plus_one: z.boolean().optional(),
  photo_consent: z.boolean().optional(),
  plus_one_name: z.string().optional(),
  plus_one_allergies: z.array(z.string()).optional(),
  plus_one_dietary: z.array(z.string()).optional(),
})

const VisibilitySettingsSchema = z.object({
  show_date_time: z.boolean().optional(),
  show_location: z.boolean().optional(),
  show_occasion: z.boolean().optional(),
  show_menu: z.boolean().optional(),
  show_dietary_info: z.boolean().optional(),
  show_special_requests: z.boolean().optional(),
  show_guest_list: z.boolean().optional(),
  show_chef_name: z.boolean().optional(),
})

const AddGuestManuallySchema = z.object({
  eventId: z.string().uuid(),
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
})

export type SubmitRSVPInput = z.infer<typeof SubmitRSVPSchema>
export type UpdateRSVPInput = z.infer<typeof UpdateRSVPSchema>
export type VisibilitySettings = z.infer<typeof VisibilitySettingsSchema>

// ============================================================
// CLIENT ACTIONS (Authenticated)
// ============================================================

/**
 * Create a shareable link for an event (client-only).
 * Generates a unique token and returns the share URL.
 * If a share already exists for this event+client, returns the existing one.
 */
export async function createEventShare(eventId: string) {
  const user = await requireClient()
  const supabase = createServerClient()

  // Verify client owns this event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, tenant_id, client_id')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or access denied')
  }

  // Check for existing active share
  const { data: existingShare } = await supabase
    .from('event_shares')
    .select('id, token, is_active, visibility_settings')
    .eq('event_id', eventId)
    .eq('created_by_client_id', user.entityId)
    .eq('is_active', true)
    .single()

  if (existingShare) {
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${existingShare.token}`
    return { success: true, share: existingShare, shareUrl }
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex')

  const { data: share, error } = await supabase
    .from('event_shares')
    .insert({
      tenant_id: event.tenant_id,
      event_id: eventId,
      created_by_client_id: user.entityId,
      token,
    })
    .select()
    .single()

  if (error) {
    console.error('[createEventShare] Error:', error)
    throw new Error('Failed to create share link')
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${token}`

  revalidatePath(`/my-events/${eventId}`)
  return { success: true, share, shareUrl }
}

/**
 * Revoke (deactivate) a share link (client-only).
 */
export async function revokeEventShare(eventShareId: string) {
  const user = await requireClient()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('event_shares')
    .update({ is_active: false })
    .eq('id', eventShareId)
    .eq('created_by_client_id', user.entityId)

  if (error) {
    console.error('[revokeEventShare] Error:', error)
    throw new Error('Failed to revoke share link')
  }

  revalidatePath('/my-events')
  return { success: true }
}

/**
 * Add a guest manually to an event (client-only).
 * Creates a guest record with 'pending' RSVP status.
 */
export async function addGuestManually(input: z.infer<typeof AddGuestManuallySchema>) {
  const user = await requireClient()
  const validated = AddGuestManuallySchema.parse(input)
  const supabase = createServerClient()

  // Verify client owns this event
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id')
    .eq('id', validated.eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) {
    throw new Error('Event not found or access denied')
  }

  // Get or create active share for this event
  let { data: share } = await supabase
    .from('event_shares')
    .select('id')
    .eq('event_id', validated.eventId)
    .eq('created_by_client_id', user.entityId)
    .eq('is_active', true)
    .single()

  if (!share) {
    // Auto-create a share link
    const result = await createEventShare(validated.eventId)
    share = result.share
  }

  const guestToken = crypto.randomBytes(32).toString('hex')

  const { data: guest, error } = await supabase
    .from('event_guests')
    .insert({
      tenant_id: event.tenant_id,
      event_id: validated.eventId,
      event_share_id: share.id,
      guest_token: guestToken,
      full_name: validated.full_name,
      email: validated.email || null,
      rsvp_status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[addGuestManually] Error:', error)
    throw new Error('Failed to add guest')
  }

  revalidatePath(`/my-events/${validated.eventId}`)
  return { success: true, guest }
}

// ============================================================
// CHEF ACTIONS (Authenticated)
// ============================================================

/**
 * Update guest visibility settings for a share (chef-only).
 * Controls what event details guests can see.
 */
export async function updateGuestVisibility(eventShareId: string, settings: VisibilitySettings) {
  const user = await requireChef()
  const validated = VisibilitySettingsSchema.parse(settings)
  const supabase = createServerClient()

  // Fetch current settings and merge (partial update)
  const { data: share } = await supabase
    .from('event_shares')
    .select('visibility_settings')
    .eq('id', eventShareId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!share) {
    throw new Error('Share not found or access denied')
  }

  const currentSettings = (share.visibility_settings || {}) as Record<string, boolean>
  const merged = { ...currentSettings, ...validated }

  const { error } = await supabase
    .from('event_shares')
    .update({ visibility_settings: merged })
    .eq('id', eventShareId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateGuestVisibility] Error:', error)
    throw new Error('Failed to update visibility settings')
  }

  revalidatePath('/events')
  return { success: true }
}

/**
 * Get all guests for an event (chef or client).
 */
export async function getEventGuests(eventId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Authentication required')

  const supabase = createServerClient()

  // Build query based on role
  let query = supabase
    .from('event_guests')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (user.role === 'chef') {
    query = query.eq('tenant_id', user.tenantId!)
  } else {
    // Client -- verify they own the event
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('client_id', user.entityId)
      .single()

    if (!event) throw new Error('Event not found or access denied')
  }

  const { data: guests, error } = await query

  if (error) {
    console.error('[getEventGuests] Error:', error)
    throw new Error('Failed to fetch guests')
  }

  return guests || []
}

/**
 * Get RSVP summary for an event (chef or client).
 * Returns aggregate counts and dietary info.
 */
export async function getEventRSVPSummary(eventId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Authentication required')

  const supabase = createServerClient()

  // Verify access
  if (user.role === 'chef') {
    const { data } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single()
    if (!data) throw new Error('Event not found')
  } else {
    const { data } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('client_id', user.entityId)
      .single()
    if (!data) throw new Error('Event not found')
  }

  const { data: summary, error } = await supabase
    .from('event_rsvp_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found (no guests yet)
    console.error('[getEventRSVPSummary] Error:', error)
    throw new Error('Failed to fetch RSVP summary')
  }

  return (
    summary || {
      event_id: eventId,
      total_guests: 0,
      attending_count: 0,
      declined_count: 0,
      maybe_count: 0,
      pending_count: 0,
      plus_one_count: 0,
      all_dietary_restrictions: [],
      all_allergies: [],
    }
  )
}

/**
 * Get event share(s) for an event (chef or client).
 */
export async function getEventShares(eventId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Authentication required')

  const supabase = createServerClient()

  let query = supabase.from('event_shares').select('*').eq('event_id', eventId)

  if (user.role === 'chef') {
    query = query.eq('tenant_id', user.tenantId!)
  } else {
    query = query.eq('created_by_client_id', user.entityId)
  }

  const { data: shares, error } = await query

  if (error) {
    console.error('[getEventShares] Error:', error)
    throw new Error('Failed to fetch shares')
  }

  return shares || []
}

// ============================================================
// PUBLIC ACTIONS (No auth required -- token-validated)
// ============================================================

/**
 * Get event details for the public share page.
 * Uses admin client to bypass RLS.
 * Respects visibility settings -- only returns fields the chef has enabled.
 */
export async function getEventShareByToken(token: string) {
  const supabase = createServerClient({ admin: true })

  // Fetch share by token
  const { data: share, error: shareError } = await supabase
    .from('event_shares')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (shareError || !share) {
    return null
  }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return null
  }

  // Fetch event details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(
      `
      id, tenant_id, event_date, serve_time, arrival_time,
      guest_count, occasion, service_style,
      location_address, location_city, location_state, location_zip,
      location_notes, dietary_restrictions, allergies,
      special_requests, status
    `
    )
    .eq('id', share.event_id)
    .single()

  if (eventError || !event) {
    return null
  }

  // Don't show cancelled events
  if (event.status === 'cancelled') {
    return null
  }

  // Fetch chef name + profile slug for "book your own" CTA
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, display_name, booking_slug')
    .eq('id', share.tenant_id)
    .single()

  // Fetch menus if visibility allows
  const visibility = share.visibility_settings as Record<string, boolean>
  let menus: {
    id: string
    name: string
    description: string | null
    service_style: string | null
  }[] = []

  if (visibility.show_menu) {
    const { data: menuData } = await supabase
      .from('menus')
      .select('id, name, description, service_style')
      .eq('event_id', share.event_id)

    menus = menuData || []
  }

  // Fetch existing guest list if visibility allows
  let guestList: { full_name: string; rsvp_status: string }[] = []

  if (visibility.show_guest_list) {
    const { data: guests } = await supabase
      .from('event_guests')
      .select('full_name, rsvp_status')
      .eq('event_share_id', share.id)
      .order('created_at', { ascending: true })

    guestList = guests || []
  }

  // Build response respecting visibility
  return {
    shareId: share.id,
    eventId: event.id,
    status: event.status,
    visibility,
    // Always shown
    occasion: visibility.show_occasion ? event.occasion : null,
    // Conditional fields
    eventDate: visibility.show_date_time ? event.event_date : null,
    serveTime: visibility.show_date_time ? event.serve_time : null,
    arrivalTime: visibility.show_date_time ? event.arrival_time : null,
    guestCount: event.guest_count,
    location: visibility.show_location
      ? {
          address: event.location_address,
          city: event.location_city,
          state: event.location_state,
          zip: event.location_zip,
          notes: event.location_notes,
        }
      : null,
    chefName: visibility.show_chef_name ? chef?.display_name || chef?.business_name : null,
    chefProfileUrl: (chef as any)?.booking_slug ? `/chef/${(chef as any).booking_slug}` : null,
    menus,
    dietaryInfo: visibility.show_dietary_info
      ? {
          restrictions: event.dietary_restrictions,
          allergies: event.allergies,
        }
      : null,
    specialRequests: visibility.show_special_requests ? event.special_requests : null,
    guestList,
    serviceStyle: event.service_style,
  }
}

/**
 * Submit an RSVP (public -- no auth required).
 * Validates share token, creates guest record, returns guest token for editing.
 */
export async function submitRSVP(input: SubmitRSVPInput) {
  const validated = SubmitRSVPSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  // Validate share token
  const { data: share, error: shareError } = await supabase
    .from('event_shares')
    .select('id, event_id, tenant_id, is_active, expires_at')
    .eq('token', validated.shareToken)
    .eq('is_active', true)
    .single()

  if (shareError || !share) {
    throw new Error('Invalid or expired share link')
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    throw new Error('This share link has expired')
  }

  // Check for duplicate email if provided
  if (validated.email) {
    const { data: existing } = await supabase
      .from('event_guests')
      .select('id, guest_token')
      .eq('event_share_id', share.id)
      .eq('email', validated.email)
      .single()

    if (existing) {
      // Return existing guest token so they can update instead
      return {
        success: true,
        alreadyExists: true,
        guestToken: existing.guest_token,
        message: 'You have already RSVPed. Use the returned token to update your response.',
      }
    }
  }

  const guestToken = crypto.randomBytes(32).toString('hex')

  const { data: guest, error } = await supabase
    .from('event_guests')
    .insert({
      tenant_id: share.tenant_id,
      event_id: share.event_id,
      event_share_id: share.id,
      guest_token: guestToken,
      full_name: validated.full_name,
      email: validated.email || null,
      rsvp_status: validated.rsvp_status,
      dietary_restrictions: validated.dietary_restrictions || [],
      allergies: validated.allergies || [],
      notes: validated.notes || null,
      plus_one: validated.plus_one || false,
      photo_consent: validated.photo_consent || false,
      plus_one_name: validated.plus_one_name || null,
      plus_one_allergies: validated.plus_one_allergies || [],
      plus_one_dietary: validated.plus_one_dietary || [],
    })
    .select()
    .single()

  if (error) {
    console.error('[submitRSVP] Error:', error)
    throw new Error('Failed to submit RSVP')
  }

  return {
    success: true,
    alreadyExists: false,
    guestToken,
    guestId: guest.id,
  }
}

/**
 * Update an existing RSVP (public -- no auth required).
 * Uses guest token for identification.
 */
export async function updateRSVP(input: UpdateRSVPInput) {
  const validated = UpdateRSVPSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  const { guestToken, ...updateData } = validated

  // Build update payload (only include provided fields)
  const payload: Record<string, unknown> = {}
  if (updateData.full_name !== undefined) payload.full_name = updateData.full_name
  if (updateData.rsvp_status !== undefined) payload.rsvp_status = updateData.rsvp_status
  if (updateData.dietary_restrictions !== undefined)
    payload.dietary_restrictions = updateData.dietary_restrictions
  if (updateData.allergies !== undefined) payload.allergies = updateData.allergies
  if (updateData.notes !== undefined) payload.notes = updateData.notes
  if (updateData.plus_one !== undefined) payload.plus_one = updateData.plus_one
  if (updateData.photo_consent !== undefined) payload.photo_consent = updateData.photo_consent
  if (updateData.plus_one_name !== undefined) payload.plus_one_name = updateData.plus_one_name
  if (updateData.plus_one_allergies !== undefined)
    payload.plus_one_allergies = updateData.plus_one_allergies
  if (updateData.plus_one_dietary !== undefined)
    payload.plus_one_dietary = updateData.plus_one_dietary

  const { data: guest, error } = await supabase
    .from('event_guests')
    .update(payload)
    .eq('guest_token', guestToken)
    .select()
    .single()

  if (error) {
    console.error('[updateRSVP] Error:', error)
    throw new Error('Failed to update RSVP')
  }

  return { success: true, guest }
}

/**
 * Get a guest's RSVP by their token (public -- no auth required).
 */
export async function getGuestByToken(guestToken: string) {
  const supabase = createServerClient({ admin: true })

  const { data: guest, error } = await supabase
    .from('event_guests')
    .select('*')
    .eq('guest_token', guestToken)
    .single()

  if (error) {
    return null
  }

  return guest
}
