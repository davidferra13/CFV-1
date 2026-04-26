'use server'

import crypto from 'crypto'
import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { revalidatePath } from 'next/cache'

/**
 * Chef-authenticated: generate a split share token for an event.
 * Returns the token (idempotent; reuses existing token if present).
 */
export async function generateSplitShareToken(eventId: string): Promise<string> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event belongs to chef
  const { data: event, error } = await db
    .from('events')
    .select('id, split_share_token')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !event) {
    throw new Error('Event not found')
  }

  // Reuse existing token
  if (event.split_share_token) {
    return event.split_share_token
  }

  // Generate new token
  const token = crypto.randomBytes(24).toString('base64url')

  const { error: updateError } = await db
    .from('events')
    .update({ split_share_token: token })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    throw new Error('Failed to generate split share link')
  }

  revalidatePath(`/events/${eventId}`)
  return token
}

/**
 * Client-authenticated: generate or retrieve split share token for their event.
 */
export async function generateClientSplitShareToken(eventId: string): Promise<string> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: event, error } = await db
    .from('events')
    .select('id, split_share_token')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (error || !event) {
    throw new Error('Event not found')
  }

  if (event.split_share_token) {
    return event.split_share_token
  }

  const token = crypto.randomBytes(24).toString('base64url')

  const { error: updateError } = await db
    .from('events')
    .update({ split_share_token: token })
    .eq('id', eventId)
    .eq('client_id', user.entityId)

  if (updateError) {
    throw new Error('Failed to generate split share link')
  }

  revalidatePath(`/my-events/${eventId}`)
  return token
}

export type SplitPublicData = {
  eventName: string
  eventDate: string
  location: string | null
  totalCents: number
  guestCount: number
  perPersonCents: number
  chefName: string
  chefEmail: string | null
  chefPhone: string | null
  splitEntries: Array<{ firstName: string; paid: boolean }> | null
}

/**
 * Public: get split data by token. No auth required.
 */
export async function getSplitByToken(token: string): Promise<SplitPublicData | null> {
  if (!token || token.length < 10) return null

  const db: any = createAdminClient()

  const { data: event, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, quoted_price_cents,
      location_city, location_state, split_billing,
      tenant_id
    `
    )
    .eq('split_share_token', token)
    .single()

  if (error || !event) return null

  // Get the client-facing total from financial summary
  const { data: financial } = await db
    .from('event_financial_summary')
    .select('quoted_price_cents')
    .eq('event_id', event.id)
    .single()

  const totalCents = financial?.quoted_price_cents ?? event.quoted_price_cents ?? 0
  const guestCount = event.guest_count ?? 1

  // Per-person: round up to nearest cent
  const perPersonCents = Math.ceil(totalCents / guestCount)

  // Get chef contact info (public-safe fields only)
  const { data: chef } = await db
    .from('chefs')
    .select('business_name, full_name, email, phone')
    .eq('id', event.tenant_id)
    .single()

  // Parse split_billing for first names + paid status (no PII beyond first names)
  let splitEntries: Array<{ firstName: string; paid: boolean }> | null = null
  if (event.split_billing && Array.isArray(event.split_billing)) {
    const parsed = event.split_billing
      .filter((e: any) => e.name || e.first_name)
      .map((e: any) => ({
        firstName: e.first_name || e.name?.split(' ')[0] || 'Guest',
        paid: Boolean(e.paid),
      }))

    splitEntries = parsed.length > 0 ? parsed : null
  }

  // Location: city/state only (no street address for privacy)
  const locationParts = [event.location_city, event.location_state].filter(Boolean)

  return {
    eventName: event.occasion || 'Private Event',
    eventDate: event.event_date,
    location: locationParts.length > 0 ? locationParts.join(', ') : null,
    totalCents,
    guestCount,
    perPersonCents,
    chefName: chef?.business_name || chef?.full_name || 'Your Chef',
    chefEmail: chef?.email || null,
    chefPhone: chef?.phone || null,
    splitEntries,
  }
}

/**
 * Client-authenticated: get split data for their event.
 */
export async function getClientSplitView(eventId: string): Promise<SplitPublicData | null> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: event, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, quoted_price_cents,
      location_city, location_state, split_billing,
      tenant_id, split_share_token
    `
    )
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (error || !event) return null

  const { data: financial } = await db
    .from('event_financial_summary')
    .select('quoted_price_cents')
    .eq('event_id', event.id)
    .single()

  const totalCents = financial?.quoted_price_cents ?? event.quoted_price_cents ?? 0
  const guestCount = event.guest_count ?? 1
  const perPersonCents = Math.ceil(totalCents / guestCount)

  const { data: chef } = await db
    .from('chefs')
    .select('business_name, full_name, email, phone')
    .eq('id', event.tenant_id)
    .single()

  let splitEntries: Array<{ firstName: string; paid: boolean }> | null = null
  if (event.split_billing && Array.isArray(event.split_billing)) {
    const parsed = event.split_billing
      .filter((e: any) => e.name || e.first_name)
      .map((e: any) => ({
        firstName: e.first_name || e.name?.split(' ')[0] || 'Guest',
        paid: Boolean(e.paid),
      }))

    splitEntries = parsed.length > 0 ? parsed : null
  }

  const locationParts = [event.location_city, event.location_state].filter(Boolean)

  return {
    eventName: event.occasion || 'Private Event',
    eventDate: event.event_date,
    location: locationParts.length > 0 ? locationParts.join(', ') : null,
    totalCents,
    guestCount,
    perPersonCents,
    chefName: chef?.business_name || chef?.full_name || 'Your Chef',
    chefEmail: chef?.email || null,
    chefPhone: chef?.phone || null,
    splitEntries,
  }
}
