// Event Ticketing System - Public Purchase Actions
// No auth required. Handles public ticket purchases via Stripe Checkout.
// Modeled after lib/booking/instant-book-actions.ts pattern.

'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rateLimit'
import { headers } from 'next/headers'
import type { EventTicketType } from './types'
import type Stripe from 'stripe'

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

// ─── Schemas ─────────────────────────────────────────────────────────

const PurchaseTicketSchema = z.object({
  shareToken: z.string().min(1),
  ticketTypeId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  buyerName: z.string().min(1).max(200),
  buyerEmail: z.string().email().max(320),
  buyerPhone: z.string().max(50).optional().or(z.literal('')),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  plusOneName: z.string().max(200).optional().or(z.literal('')),
  plusOneDietary: z.array(z.string()).optional(),
  plusOneAllergies: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export type PurchaseTicketInput = z.infer<typeof PurchaseTicketSchema>

export type PurchaseTicketResult = {
  checkoutUrl: string
  ticketId: string
  totalCents: number
}

// ─── Public: Get event info for ticket page ──────────────────────────

export type PublicEventInfo = {
  eventId: string
  tenantId: string
  eventName: string
  eventDate: string | null
  serveTime: string | null
  locationText: string | null
  guestCount: number | null
  occasion: string | null
  chefName: string | null
  chefSlug: string | null
  chefImageUrl: string | null
  ticketTypes: EventTicketType[]
  ticketsEnabled: boolean
  showMenu: boolean
  showDate: boolean
  showLocation: boolean
  showChefName: boolean
  menuSummary: string | null
}

export async function getPublicEventByShareToken(
  shareToken: string
): Promise<PublicEventInfo | null> {
  const db: any = createServerClient({ admin: true })

  // Get share settings
  const { data: share } = await db
    .from('event_share_settings')
    .select(
      'event_id, tenant_id, tickets_enabled, show_menu, show_date, show_location, show_chef_name'
    )
    .eq('share_token', shareToken)
    .single()

  if (!share) return null

  // Get event
  const { data: event } = await db
    .from('events')
    .select('id, title, event_date, serve_time, location, guest_count, occasion')
    .eq('id', share.event_id)
    .single()

  if (!event) return null

  // Get chef info
  const { data: chef } = await db
    .from('chefs')
    .select('business_name, booking_slug, profile_image_url')
    .eq('id', share.tenant_id)
    .single()

  // Get active ticket types
  const { data: ticketTypes } = await db
    .from('event_ticket_types')
    .select('*')
    .eq('event_id', event.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // Get menu summary if visible
  let menuSummary: string | null = null
  if (share.show_menu) {
    const { data: menuLink } = await db
      .from('event_menus')
      .select('menu_id, menus(name, description)')
      .eq('event_id', event.id)
      .limit(1)
      .maybeSingle()

    if (menuLink?.menus) {
      menuSummary = (menuLink.menus as any).description || (menuLink.menus as any).name || null
    }
  }

  return {
    eventId: event.id,
    tenantId: share.tenant_id,
    eventName: event.title || event.occasion || 'Event',
    eventDate: share.show_date !== false ? event.event_date : null,
    serveTime: share.show_date !== false ? event.serve_time : null,
    locationText: share.show_location !== false ? event.location : null,
    guestCount: event.guest_count,
    occasion: event.occasion,
    chefName: share.show_chef_name !== false ? (chef?.business_name ?? null) : null,
    chefSlug: chef?.booking_slug ?? null,
    chefImageUrl: chef?.profile_image_url ?? null,
    ticketTypes: (ticketTypes ?? []).map((tt: any) => ({
      ...tt,
      remaining: tt.capacity !== null ? Math.max(0, tt.capacity - tt.sold_count) : null,
    })),
    ticketsEnabled: share.tickets_enabled === true,
    showMenu: share.show_menu !== false,
    showDate: share.show_date !== false,
    showLocation: share.show_location !== false,
    showChefName: share.show_chef_name !== false,
    menuSummary,
  }
}

// ─── Public: Upcoming ticketed events for a chef ────────────────────

export type PublicUpcomingEvent = {
  shareToken: string
  eventName: string
  eventDate: string
  serveTime: string | null
  locationCity: string | null
  occasion: string | null
  minPriceCents: number | null
  maxPriceCents: number | null
  ticketTypesCount: number
}

export async function getUpcomingPublicEvents(tenantId: string): Promise<PublicUpcomingEvent[]> {
  const db: any = createServerClient({ admin: true })
  const today = new Date().toISOString().split('T')[0]

  // Get share settings with tickets enabled for this chef
  const { data: shares } = await db
    .from('event_share_settings')
    .select('event_id, share_token, tickets_enabled')
    .eq('tenant_id', tenantId)
    .eq('tickets_enabled', true)

  if (!shares || shares.length === 0) return []

  const eventIds = shares.map((s: any) => s.event_id)
  const tokenMap = new Map(shares.map((s: any) => [s.event_id, s.share_token]))

  // Get upcoming, non-cancelled events
  const { data: events } = await db
    .from('events')
    .select('id, event_date, serve_time, occasion, location_city, status')
    .eq('tenant_id', tenantId)
    .in('id', eventIds)
    .gte('event_date', today)
    .not('status', 'in', '("cancelled","draft")')
    .order('event_date', { ascending: true })
    .limit(10)

  if (!events || events.length === 0) return []

  // Get ticket type pricing for these events
  const { data: ticketTypes } = await db
    .from('event_ticket_types')
    .select('event_id, price_cents')
    .in(
      'event_id',
      events.map((e: any) => e.id)
    )
    .eq('is_active', true)

  const pricesByEvent = new Map<string, number[]>()
  for (const tt of ticketTypes ?? []) {
    const prices = pricesByEvent.get(tt.event_id) ?? []
    prices.push(tt.price_cents)
    pricesByEvent.set(tt.event_id, prices)
  }

  return events.map((e: any) => {
    const prices = pricesByEvent.get(e.id) ?? []
    return {
      shareToken: tokenMap.get(e.id),
      eventName: e.occasion || 'Event',
      eventDate: e.event_date,
      serveTime: e.serve_time,
      locationCity: e.location_city,
      occasion: e.occasion,
      minPriceCents: prices.length > 0 ? Math.min(...prices) : null,
      maxPriceCents: prices.length > 0 ? Math.max(...prices) : null,
      ticketTypesCount: prices.length,
    }
  })
}

// ─── Public: Purchase ticket via Stripe Checkout ─────────────────────

export async function purchaseTicket(input: PurchaseTicketInput): Promise<PurchaseTicketResult> {
  const validated = PurchaseTicketSchema.parse(input)
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  // Rate limit: 10 ticket purchases per 10 minutes per IP
  try {
    await checkRateLimit(`ticket-purchase:${ip}`, 10, 10 * 60_000)
  } catch {
    throw new Error('Too many purchase attempts. Please try again in a few minutes.')
  }

  const db: any = createServerClient({ admin: true })

  // Resolve share token -> event + tenant
  const { data: share } = await db
    .from('event_share_settings')
    .select('event_id, tenant_id, tickets_enabled')
    .eq('share_token', validated.shareToken)
    .single()

  if (!share) throw new Error('Event not found')
  if (!share.tickets_enabled) throw new Error('Tickets are not available for this event')

  const eventId = share.event_id as string
  const tenantId = share.tenant_id as string

  // Verify ticket type exists and is active
  const { data: ticketType } = await db
    .from('event_ticket_types')
    .select('id, name, price_cents, capacity, sold_count, is_active')
    .eq('id', validated.ticketTypeId)
    .eq('event_id', eventId)
    .single()

  if (!ticketType || !ticketType.is_active) {
    throw new Error('Ticket type not found or no longer available')
  }

  // Capacity check (atomic via CAS)
  if (ticketType.capacity !== null) {
    const newSold = ticketType.sold_count + validated.quantity
    if (newSold > ticketType.capacity) {
      const remaining = ticketType.capacity - ticketType.sold_count
      throw new Error(
        remaining > 0
          ? `Only ${remaining} ticket(s) remaining for ${ticketType.name}`
          : `${ticketType.name} is sold out`
      )
    }
  }

  const unitPriceCents = ticketType.price_cents
  const totalCents = unitPriceCents * validated.quantity

  // Create pending ticket record
  const { data: ticket, error: ticketError } = await db
    .from('event_tickets')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      ticket_type_id: validated.ticketTypeId,
      buyer_name: validated.buyerName.trim(),
      buyer_email: validated.buyerEmail.toLowerCase().trim(),
      buyer_phone: validated.buyerPhone?.trim() || null,
      quantity: validated.quantity,
      unit_price_cents: unitPriceCents,
      total_cents: totalCents,
      payment_status: 'pending',
      source: 'chefflow',
      dietary_restrictions: validated.dietaryRestrictions ?? [],
      allergies: validated.allergies ?? [],
      plus_one_name: validated.plusOneName?.trim() || null,
      plus_one_dietary: validated.plusOneDietary ?? [],
      plus_one_allergies: validated.plusOneAllergies ?? [],
      notes: validated.notes?.trim() || null,
    })
    .select('id, guest_token')
    .single()

  if (ticketError) throw new Error(`Failed to create ticket: ${ticketError.message}`)

  // Optimistically reserve capacity (CAS guard)
  if (ticketType.capacity !== null) {
    const { error: casError } = await db
      .from('event_ticket_types')
      .update({ sold_count: ticketType.sold_count + validated.quantity })
      .eq('id', validated.ticketTypeId)
      .eq('sold_count', ticketType.sold_count) // CAS: only succeeds if nobody else sold between reads

    if (casError) {
      // CAS failed = someone else bought simultaneously. Clean up and fail.
      await db.from('event_tickets').delete().eq('id', ticket.id)
      throw new Error('Someone else just grabbed those seats. Please try again.')
    }
  }

  // Create Stripe Checkout Session
  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

  // Get chef Stripe config for transfer routing
  const { getChefStripeConfig, computeApplicationFee } =
    await import('@/lib/stripe/transfer-routing')
  const chefConfig = await getChefStripeConfig(tenantId)

  // Get event name for checkout description
  const { data: event } = await db
    .from('events')
    .select('title, occasion, event_date')
    .eq('id', eventId)
    .single()

  const eventName = event?.title || event?.occasion || 'Event'
  const eventDate = event?.event_date || ''

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${ticketType.name} - ${eventName}`,
          description: eventDate ? `${eventDate}` : undefined,
        },
        unit_amount: unitPriceCents,
      },
      quantity: validated.quantity,
    },
  ]

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: lineItems,
    customer_email: validated.buyerEmail.toLowerCase().trim(),
    success_url: `${appUrl}/e/${validated.shareToken}?purchased=true&ticket=${ticket.id}`,
    cancel_url: `${appUrl}/e/${validated.shareToken}?cancelled=true`,
    metadata: {
      ticket_id: ticket.id,
      event_id: eventId,
      tenant_id: tenantId,
      ticket_type_id: validated.ticketTypeId,
      type: 'event_ticket',
    },
    payment_intent_data: {
      metadata: {
        ticket_id: ticket.id,
        event_id: eventId,
        tenant_id: tenantId,
        type: 'event_ticket',
      },
    },
  }

  // Route payment to chef's connected account if available
  if (chefConfig.canReceiveTransfers && chefConfig.stripeAccountId) {
    const appFee = computeApplicationFee(
      totalCents,
      chefConfig.platformFeePercent,
      chefConfig.platformFeeFixedCents
    )
    sessionParams.payment_intent_data!.application_fee_amount = appFee
    sessionParams.payment_intent_data!.transfer_data = {
      destination: chefConfig.stripeAccountId,
    }
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  // Store Stripe session ID on ticket
  await db
    .from('event_tickets')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', ticket.id)

  if (!session.url) {
    throw new Error('Failed to create checkout session')
  }

  return {
    checkoutUrl: session.url,
    ticketId: ticket.id,
    totalCents,
  }
}

// ─── Public: Get ticket by guest token (self-service) ────────────────

export async function getTicketByGuestToken(guestToken: string) {
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('event_tickets')
    .select('*, event_ticket_types(name, description)')
    .eq('guest_token', guestToken)
    .single()

  if (error || !data) return null

  // Get event info
  const { data: event } = await db
    .from('events')
    .select('title, occasion, event_date, serve_time, location')
    .eq('id', data.event_id)
    .single()

  return {
    ticket: {
      ...data,
      ticket_type: data.event_ticket_types ?? null,
      event_ticket_types: undefined,
    },
    event: event ?? null,
  }
}
