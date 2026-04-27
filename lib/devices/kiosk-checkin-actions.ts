'use server'

import { createAdminClient } from '@/lib/db/admin'

/**
 * Get today's events for a kiosk device's chef (tenant).
 * Returns events happening today with basic details for guest selection.
 */
export async function getKioskEvents(tenantId: string): Promise<{
  data: Array<{
    id: string
    event_date: string
    occasion: string | null
    serve_time: string | null
    guest_count: number
    location_address: string | null
    client_name: string | null
  }>
  error: string | null
}> {
  try {
    const db: any = createAdminClient()

    // Get today's date in local format (YYYY-MM-DD)
    const today = new Date()
    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')

    const { data: events, error } = await db
      .from('events')
      .select('id, event_date, occasion, serve_time, guest_count, location_address, client_id')
      .eq('tenant_id', tenantId)
      .eq('event_date', todayStr)
      .in('status', ['confirmed', 'in_progress', 'paid', 'accepted'])
      .order('serve_time', { ascending: true })

    if (error) {
      console.error('[kiosk-checkin] Failed to fetch events:', error)
      return { data: [], error: 'Failed to load events' }
    }

    if (!events || events.length === 0) {
      return { data: [], error: null }
    }

    // Fetch client names for each event
    const clientIds = [...new Set(events.map((e: any) => e.client_id).filter(Boolean))]
    let clientMap: Record<string, string> = {}

    if (clientIds.length > 0) {
      const { data: clients } = await db
        .from('clients')
        .select('id, full_name')
        .in('id', clientIds)

      if (clients) {
        for (const c of clients) {
          clientMap[c.id] = c.full_name
        }
      }
    }

    return {
      data: events.map((e: any) => ({
        id: e.id,
        event_date: e.event_date,
        occasion: e.occasion,
        serve_time: e.serve_time,
        guest_count: e.guest_count,
        location_address: e.location_address,
        client_name: clientMap[e.client_id] || null,
      })),
      error: null,
    }
  } catch (err) {
    console.error('[kiosk-checkin] Error fetching events:', err)
    return { data: [], error: 'Failed to load events' }
  }
}

/**
 * Check in a guest by matching name or email against the event's guest list.
 * Returns guest details on success, or a "not found" result for walk-in handling.
 */
export async function checkInGuest(
  tenantId: string,
  eventId: string,
  nameOrEmail: string
): Promise<{
  success: boolean
  found: boolean
  guest?: {
    id: string
    full_name: string
    email: string | null
    dietary_restrictions: string[]
    allergies: string[]
    dietary_notes: string | null
    plus_one: boolean
    plus_one_name: string | null
    rsvp_status: string
  }
  error?: string
}> {
  try {
    const db: any = createAdminClient()
    const search = nameOrEmail.trim().toLowerCase()

    if (!search) {
      return { success: false, found: false, error: 'Name or email is required' }
    }

    // Verify event belongs to this tenant
    const { data: event, error: eventErr } = await db
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (eventErr || !event) {
      return { success: false, found: false, error: 'Event not found' }
    }

    // Search guests by name (case-insensitive partial match) or email (exact match)
    const { data: guests, error: guestErr } = await db
      .from('event_guests')
      .select(
        'id, full_name, email, dietary_restrictions, allergies, dietary_notes, plus_one, plus_one_name, rsvp_status, actual_attended'
      )
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)

    if (guestErr) {
      console.error('[kiosk-checkin] Guest lookup error:', guestErr)
      return { success: false, found: false, error: 'Failed to search guest list' }
    }

    if (!guests || guests.length === 0) {
      return { success: false, found: false }
    }

    // Find matching guest: exact email match first, then name match
    let match = guests.find(
      (g: any) => g.email && g.email.toLowerCase() === search
    )

    if (!match) {
      match = guests.find(
        (g: any) => g.full_name && g.full_name.toLowerCase() === search
      )
    }

    // Partial name match as fallback
    if (!match) {
      match = guests.find(
        (g: any) => g.full_name && g.full_name.toLowerCase().includes(search)
      )
    }

    if (!match) {
      return { success: false, found: false }
    }

    // Mark as attended
    try {
      await db
        .from('event_guests')
        .update({
          actual_attended: 'attended',
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.id)
    } catch (updateErr) {
      console.error('[kiosk-checkin] Failed to update attendance (non-blocking):', updateErr)
    }

    // Filter out empty strings from arrays
    const dietary = (match.dietary_restrictions || []).filter((d: string) => d && d.trim())
    const allergyList = (match.allergies || []).filter((a: string) => a && a.trim())

    return {
      success: true,
      found: true,
      guest: {
        id: match.id,
        full_name: match.full_name,
        email: match.email,
        dietary_restrictions: dietary,
        allergies: allergyList,
        dietary_notes: match.dietary_notes,
        plus_one: match.plus_one,
        plus_one_name: match.plus_one_name,
        rsvp_status: match.rsvp_status,
      },
    }
  } catch (err) {
    console.error('[kiosk-checkin] Error checking in guest:', err)
    return { success: false, found: false, error: 'Check-in failed' }
  }
}

/**
 * Add a walk-in guest to an event (not on the original guest list).
 */
export async function addWalkInGuest(
  tenantId: string,
  eventId: string,
  fullName: string,
  email?: string
): Promise<{
  success: boolean
  guest_id?: string
  error?: string
}> {
  try {
    const db: any = createAdminClient()

    // Verify event belongs to this tenant
    const { data: event, error: eventErr } = await db
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (eventErr || !event) {
      return { success: false, error: 'Event not found' }
    }

    // Get event_share_id for this event (required FK)
    const { data: share } = await db
      .from('event_shares')
      .select('id')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .limit(1)
      .single()

    // Generate a unique guest token
    const { randomBytes } = await import('crypto')
    const guestToken = randomBytes(16).toString('hex')

    const insertData: Record<string, any> = {
      tenant_id: tenantId,
      event_id: eventId,
      event_share_id: share?.id || null,
      guest_token: guestToken,
      full_name: fullName.trim(),
      rsvp_status: 'attending',
      actual_attended: 'attended',
      notes: 'Walk-in (added via kiosk check-in)',
    }

    if (email?.trim()) {
      insertData.email = email.trim().toLowerCase()
    }

    // event_share_id is NOT NULL in the schema, so we need a share
    if (!share?.id) {
      // Create a minimal share for walk-ins
      const { data: newShare, error: shareErr } = await db
        .from('event_shares')
        .insert({
          event_id: eventId,
          tenant_id: tenantId,
          is_active: true,
          share_type: 'rsvp',
        })
        .select('id')
        .single()

      if (shareErr || !newShare) {
        console.error('[kiosk-checkin] Failed to create share for walk-in:', shareErr)
        return { success: false, error: 'Failed to register walk-in' }
      }

      insertData.event_share_id = newShare.id
    }

    const { data: guest, error: insertErr } = await db
      .from('event_guests')
      .insert(insertData)
      .select('id')
      .single()

    if (insertErr || !guest) {
      console.error('[kiosk-checkin] Walk-in insert error:', insertErr)
      return { success: false, error: 'Failed to register walk-in' }
    }

    return { success: true, guest_id: guest.id }
  } catch (err) {
    console.error('[kiosk-checkin] Walk-in error:', err)
    return { success: false, error: 'Failed to register walk-in' }
  }
}
