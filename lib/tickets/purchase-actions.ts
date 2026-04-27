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
import { normalizeDinnerCircleConfig } from '@/lib/dinner-circles/event-circle'
import type { DinnerCircleConfig } from '@/lib/dinner-circles/types'

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

// ─── Schemas ─────────────────────────────────────────────────────────

const AddonSelectionSchema = z.object({
  addonId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
})

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
  addons: z.array(AddonSelectionSchema).optional(),
  circleToken: z.string().optional().or(z.literal('')),
})

const JoinTicketWaitlistSchema = z.object({
  shareToken: z.string().min(1),
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email().max(320),
  quantity: z.number().int().min(1).max(20).default(1),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export type PurchaseTicketInput = z.infer<typeof PurchaseTicketSchema>
export type JoinTicketWaitlistInput = z.infer<typeof JoinTicketWaitlistSchema>

export type PurchaseTicketResult = {
  checkoutUrl: string
  ticketId: string
  totalCents: number
}

type AddonLineItem = {
  addonId: string
  name: string
  priceCents: number
  quantity: number
}

async function createCheckoutSessionForTicket(input: {
  db: any
  ticketId: string
  shareToken: string
  ticketType: { id: string; name: string; price_cents: number }
  eventId: string
  tenantId: string
  buyerEmail: string
  quantity: number
  totalCents: number
  addonLineItems?: AddonLineItem[]
}) {
  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

  const { getChefStripeConfig, computeApplicationFee } =
    await import('@/lib/stripe/transfer-routing')
  const chefConfig = await getChefStripeConfig(input.tenantId)

  const { data: event } = await input.db
    .from('events')
    .select('occasion, event_date')
    .eq('id', input.eventId)
    .single()

  const eventName = event?.occasion || 'Event'
  const eventDate = event?.event_date || ''

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${input.ticketType.name} - ${eventName}`,
          description: eventDate ? `${eventDate}` : undefined,
        },
        unit_amount: input.ticketType.price_cents,
      },
      quantity: input.quantity,
    },
  ]

  // Add addon line items
  if (input.addonLineItems?.length) {
    for (const addon of input.addonLineItems) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${addon.name} (add-on)`,
          },
          unit_amount: addon.priceCents,
        },
        quantity: addon.quantity,
      })
    }
  }

  const addonTotalCents = (input.addonLineItems ?? []).reduce(
    (sum, a) => sum + a.priceCents * a.quantity,
    0
  )
  const grandTotalCents = input.totalCents + addonTotalCents

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: lineItems,
    customer_email: input.buyerEmail.toLowerCase().trim(),
    success_url: `${appUrl}/e/${input.shareToken}?purchased=true&ticket=${input.ticketId}`,
    cancel_url: `${appUrl}/e/${input.shareToken}?cancelled=true&ticket=${input.ticketId}`,
    metadata: {
      ticket_id: input.ticketId,
      event_id: input.eventId,
      tenant_id: input.tenantId,
      ticket_type_id: input.ticketType.id,
      type: 'event_ticket',
    },
    payment_intent_data: {
      metadata: {
        ticket_id: input.ticketId,
        event_id: input.eventId,
        tenant_id: input.tenantId,
        ticket_type_id: input.ticketType.id,
        type: 'event_ticket',
      },
    },
  }

  if (chefConfig.canReceiveTransfers && chefConfig.stripeAccountId) {
    const appFee = computeApplicationFee(
      grandTotalCents,
      chefConfig.platformFeePercent,
      chefConfig.platformFeeFixedCents
    )
    sessionParams.payment_intent_data!.application_fee_amount = appFee
    sessionParams.payment_intent_data!.transfer_data = {
      destination: chefConfig.stripeAccountId,
    }
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  const checkoutUrl = session.url
  if (!checkoutUrl) {
    throw new Error('Failed to create checkout session')
  }

  return session
}

// ─── Public: Get event info for ticket page ──────────────────────────

export type PublicEventInfo = {
  eventId: string
  tenantId: string
  eventName: string
  status: string | null
  lifecycleState: 'upcoming' | 'live' | 'completed'
  eventDate: string | null
  createdAt: string | null
  serveTime: string | null
  locationText: string | null
  guestCount: number | null
  occasion: string | null
  chefName: string | null
  chefSlug: string | null
  chefImageUrl: string | null
  collaborators: Array<{ role: string; businessName: string }>
  menuDishes: Array<{ name: string; description: string | null; course: string | null }> | null
  ticketsSold: number
  ticketsReserved: number
  totalCapacity: number
  ticketTypes: EventTicketType[]
  addons: Array<{
    id: string
    name: string
    description: string | null
    priceCents: number
    maxPerTicket: number | null
    remaining: number | null
  }>
  ticketsEnabled: boolean
  showMenu: boolean
  showDate: boolean
  showLocation: boolean
  showChefName: boolean
  menuSummary: string | null
  circleConfig: DinnerCircleConfig
  circle: {
    groupToken: string | null
    isActive: boolean
    memberCount: number
    eventCount: number
  }
  feedback: {
    responseCount: number
    averageOverall: number | null
    averageFood: number | null
    averageExperience: number | null
    comments: Array<{ text: string; rating: number | null }>
  }
  hostStats: {
    tickets: number
    attendance: number
    revenueCents: number
    capacity: number
    sellThroughPercent: number | null
    feedbackScore: number | null
    photoCount: number
  }
  collaboratorInsights: string[]
  publicPhotos: Array<{ id: string; url: string; caption: string | null; photoType: string | null }>
}

function getPublicLifecycleState(status: string | null): PublicEventInfo['lifecycleState'] {
  if (status === 'completed') return 'completed'
  if (status === 'in_progress') return 'live'
  return 'upcoming'
}

function average(values: Array<number | null | undefined>) {
  const usable = values.filter((value): value is number => typeof value === 'number')
  if (usable.length === 0) return null
  return Number((usable.reduce((sum, value) => sum + value, 0) / usable.length).toFixed(2))
}

function formatPublicMoney(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

async function getReservedSeatsForEvent(db: any, eventId: string): Promise<number> {
  const { data: tickets } = await db
    .from('event_tickets')
    .select('quantity, payment_status, capacity_released_at')
    .eq('event_id', eventId)

  return (tickets ?? [])
    .filter(
      (ticket: any) =>
        !['cancelled', 'failed', 'refunded'].includes(ticket.payment_status) &&
        !ticket.capacity_released_at
    )
    .reduce((sum: number, ticket: any) => sum + (Number(ticket.quantity) || 0), 0)
}

async function assertEventCapacityAvailable(db: any, eventId: string, requestedSeats: number) {
  const { data: event } = await db.from('events').select('guest_count').eq('id', eventId).single()

  const eventCapacity = Number(event?.guest_count) || 0
  if (eventCapacity <= 0) return

  const reservedSeats = await getReservedSeatsForEvent(db, eventId)
  const remainingSeats = Math.max(0, eventCapacity - reservedSeats)
  if (requestedSeats > remainingSeats) {
    throw new Error(
      remainingSeats > 0
        ? `Only ${remainingSeats} spot(s) remaining for this event`
        : 'This event is sold out'
    )
  }
}

async function releaseTicketTypeReservation(db: any, ticketTypeId: string, quantity: number) {
  const { data: ticketType } = await db
    .from('event_ticket_types')
    .select('sold_count')
    .eq('id', ticketTypeId)
    .maybeSingle()

  if (!ticketType) return

  await db
    .from('event_ticket_types')
    .update({ sold_count: Math.max(0, Number(ticketType.sold_count || 0) - quantity) })
    .eq('id', ticketTypeId)
}

async function markTicketCheckoutFailed(db: any, ticketId: string, message: string) {
  const now = new Date().toISOString()
  await db
    .from('event_tickets')
    .update({
      payment_status: 'failed',
      last_payment_error: message,
      payment_failed_at: now,
      retry_available_at: now,
      capacity_released_at: now,
    })
    .eq('id', ticketId)
}

function buildCollaboratorInsights(input: {
  reserved: number
  capacity: number
  revenueCents: number
  feedbackScore: number | null
  publicPhotoCount: number
  ingredientCount: number
  sourceCount: number
  outcome: any | null
}) {
  const insights: string[] = []

  if (input.capacity > 0) {
    const demandPercent = Math.round((input.reserved / input.capacity) * 100)
    insights.push(`${demandPercent}% seat demand against listed capacity.`)
  } else if (input.reserved > 0) {
    insights.push(`${input.reserved} reserved guests captured for follow-up.`)
  }

  if (input.revenueCents > 0) {
    insights.push(`${formatPublicMoney(input.revenueCents)} ticket revenue recorded on this event.`)
  }

  if (input.feedbackScore !== null) {
    insights.push(`${input.feedbackScore.toFixed(1)}/5 average guest rating captured.`)
  }

  if (input.ingredientCount > 0 || input.sourceCount > 0) {
    insights.push(
      `${input.ingredientCount} ingredient line${input.ingredientCount === 1 ? '' : 's'} and ${input.sourceCount} source signal${input.sourceCount === 1 ? '' : 's'} preserved.`
    )
  }

  if (input.publicPhotoCount > 0) {
    insights.push(
      `${input.publicPhotoCount} public media asset${input.publicPhotoCount === 1 ? '' : 's'} available for proof and recap.`
    )
  }

  if (input.outcome?.success_score !== null && input.outcome?.success_score !== undefined) {
    insights.push(`Post-event success score: ${Number(input.outcome.success_score).toFixed(0)}.`)
  }

  return insights.slice(0, 5)
}

export async function getPublicEventByShareToken(
  shareToken: string
): Promise<PublicEventInfo | null> {
  const db: any = createServerClient({ admin: true })

  // Get share settings
  let { data: share, error: shareError } = await db
    .from('event_share_settings')
    .select(
      'event_id, tenant_id, tickets_enabled, show_menu, show_date, show_location, show_chef_name, circle_config'
    )
    .eq('share_token', shareToken)
    .single()

  if (shareError) {
    const fallback = await db
      .from('event_share_settings')
      .select(
        'event_id, tenant_id, tickets_enabled, show_menu, show_date, show_location, show_chef_name'
      )
      .eq('share_token', shareToken)
      .single()
    share = fallback.data ? { ...fallback.data, circle_config: null } : null
  }

  if (!share) return null

  // Get event
  const { data: event } = await db
    .from('events')
    .select(
      'id, status, event_date, created_at, serve_time, location_address, location_city, location_state, location_zip, guest_count, occasion'
    )
    .eq('id', share.event_id)
    .single()

  if (!event) return null
  const locationText = [
    event.location_address,
    event.location_city,
    event.location_state,
    event.location_zip,
  ]
    .filter((part: string | null | undefined) => part && part !== 'TBD')
    .join(', ')

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

    if (!menuSummary) {
      const { data: directMenu } = await db
        .from('menus')
        .select('name, description')
        .eq('event_id', event.id)
        .limit(1)
        .maybeSingle()

      menuSummary = directMenu?.description || directMenu?.name || null
    }
  }

  // Get accepted collaborators
  const { data: collaboratorRows } = await db
    .from('event_collaborators')
    .select('role, chef:chefs!event_collaborators_chef_id_fkey(business_name)')
    .eq('event_id', event.id)
    .eq('status', 'accepted')
    .order('created_at', { ascending: true })

  // Get menu dishes if visible
  let menuDishes: PublicEventInfo['menuDishes'] = null
  if (share.show_menu) {
    const { data: menuLinks } = await db
      .from('event_menus')
      .select('menu_id')
      .eq('event_id', event.id)

    let menuIds = (menuLinks ?? []).map((link: any) => link.menu_id).filter(Boolean)
    if (menuIds.length === 0) {
      const { data: directMenus } = await db.from('menus').select('id').eq('event_id', event.id)

      menuIds = (directMenus ?? []).map((menu: any) => menu.id).filter(Boolean)
    }

    if (menuIds.length > 0) {
      const { data: dishRows } = await db
        .from('dishes')
        .select('name, description, course_name, course_number, sort_order')
        .in('menu_id', menuIds)
        .not('name', 'is', null)
        .order('course_number', { ascending: true })
        .order('sort_order', { ascending: true })

      menuDishes = (dishRows ?? []).map((dish: any) => ({
        name: dish.name,
        description: dish.description ?? null,
        course: dish.course_name ?? null,
      }))
    } else {
      menuDishes = []
    }
  }

  // Get ticket sales momentum and total finite capacity
  let { data: ticketRows, error: ticketRowsError } = await db
    .from('event_tickets')
    .select('quantity, total_cents, payment_status, capacity_released_at, attended')
    .eq('event_id', event.id)

  if (ticketRowsError) {
    const fallback = await db
      .from('event_tickets')
      .select('quantity, total_cents, payment_status, attended')
      .eq('event_id', event.id)

    ticketRows = fallback.data
  }

  const ticketsReserved = (ticketRows ?? [])
    .filter(
      (ticket: any) =>
        !['cancelled', 'failed', 'refunded'].includes(ticket.payment_status) &&
        !ticket.capacity_released_at
    )
    .reduce((sum: number, ticket: any) => sum + (Number(ticket.quantity) || 0), 0)

  const ticketsSold = (ticketRows ?? [])
    .filter((ticket: any) => ticket.payment_status === 'paid')
    .reduce((sum: number, ticket: any) => sum + (Number(ticket.quantity) || 0), 0)

  const ticketRevenueCents = (ticketRows ?? [])
    .filter((ticket: any) => ticket.payment_status === 'paid')
    .reduce((sum: number, ticket: any) => sum + (Number(ticket.total_cents) || 0), 0)

  const attendedTickets = (ticketRows ?? [])
    .filter((ticket: any) => ticket.payment_status === 'paid' && ticket.attended === true)
    .reduce((sum: number, ticket: any) => sum + (Number(ticket.quantity) || 0), 0)

  const ticketTypeCapacity = (ticketTypes ?? []).reduce(
    (sum: number, ticketType: any) => sum + (Number(ticketType.capacity) || 0),
    0
  )
  const eventCapacity = Number(event.guest_count) || 0
  const totalCapacity =
    eventCapacity > 0
      ? ticketTypeCapacity > 0
        ? Math.min(eventCapacity, ticketTypeCapacity)
        : eventCapacity
      : ticketTypeCapacity

  const { data: photos } = await db
    .from('event_photos')
    .select('id, storage_path, caption, photo_type')
    .eq('event_id', event.id)
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('display_order', { ascending: true })
    .limit(8)

  const publicPhotos = (
    await Promise.all(
      (photos ?? [])
        .filter((photo: any) => Boolean(photo.storage_path))
        .map(async (photo: any) => {
          const { data: publicUrl } = await db.storage
            .from('event-photos')
            .getPublicUrl(photo.storage_path)

          return {
            id: photo.id,
            url: publicUrl?.publicUrl ?? '',
            caption: photo.caption ?? null,
            photoType: photo.photo_type ?? null,
          }
        })
    )
  ).filter((photo: any) => Boolean(photo.url))

  let circle = {
    groupToken: null as string | null,
    isActive: false,
    memberCount: 0,
    eventCount: 0,
  }
  try {
    const { data: group } = await db
      .from('hub_groups')
      .select('id, group_token, is_active')
      .eq('event_id', event.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (group?.id) {
      const [{ count: memberCount }, { count: eventCount }] = await Promise.all([
        db
          .from('hub_group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id),
        db
          .from('hub_group_events')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id),
      ])

      circle = {
        groupToken: group.group_token ?? null,
        isActive: group.is_active !== false,
        memberCount: memberCount ?? 0,
        eventCount: eventCount ?? 0,
      }
    }
  } catch {
    // Circle continuity is additive; older databases may not have every hub table.
  }

  let outcome: any | null = null
  try {
    const { data } = await db
      .from('event_outcomes')
      .select(
        'guest_response_count, guest_avg_overall, guest_avg_food, guest_avg_experience, success_score'
      )
      .eq('event_id', event.id)
      .maybeSingle()
    outcome = data ?? null
  } catch {
    outcome = null
  }

  const feedbackRatings: Array<{
    overall: number | null
    food: number | null
    experience: number | null
  }> = []
  const feedbackComments: Array<{ text: string; rating: number | null }> = []

  try {
    const { data: surveyRows } = await db
      .from('post_event_surveys')
      .select('overall, food_quality, communication_rating, completed_at')
      .eq('event_id', event.id)
      .not('completed_at', 'is', null)

    for (const row of surveyRows ?? []) {
      feedbackRatings.push({
        overall: row.overall ?? null,
        food: row.food_quality ?? null,
        experience: row.communication_rating ?? null,
      })
    }
  } catch {
    // Optional post-event survey table.
  }

  try {
    const { data: guestRows } = await db
      .from('guest_feedback')
      .select(
        'overall_rating, food_rating, experience_rating, highlight_text, testimonial_consent, submitted_at'
      )
      .eq('event_id', event.id)
      .not('submitted_at', 'is', null)

    for (const row of guestRows ?? []) {
      feedbackRatings.push({
        overall: row.overall_rating ?? null,
        food: row.food_rating ?? null,
        experience: row.experience_rating ?? null,
      })
      if (row.testimonial_consent && row.highlight_text) {
        feedbackComments.push({
          text: row.highlight_text,
          rating: row.overall_rating ?? null,
        })
      }
    }
  } catch {
    // Optional guest feedback table.
  }

  try {
    const { data: reviewRows } = await db
      .from('client_reviews')
      .select('rating, feedback_text')
      .eq('event_id', event.id)
      .eq('display_consent', true)
      .limit(4)

    for (const row of reviewRows ?? []) {
      if (row.feedback_text) {
        feedbackComments.push({
          text: row.feedback_text,
          rating: row.rating ?? null,
        })
      }
    }
  } catch {
    // Optional public reviews table.
  }

  const feedback = {
    responseCount: outcome?.guest_response_count ?? feedbackRatings.length,
    averageOverall:
      outcome?.guest_avg_overall !== null && outcome?.guest_avg_overall !== undefined
        ? Number(outcome.guest_avg_overall)
        : average(feedbackRatings.map((rating) => rating.overall)),
    averageFood:
      outcome?.guest_avg_food !== null && outcome?.guest_avg_food !== undefined
        ? Number(outcome.guest_avg_food)
        : average(feedbackRatings.map((rating) => rating.food)),
    averageExperience:
      outcome?.guest_avg_experience !== null && outcome?.guest_avg_experience !== undefined
        ? Number(outcome.guest_avg_experience)
        : average(feedbackRatings.map((rating) => rating.experience)),
    comments: feedbackComments.slice(0, 4),
  }

  const hostStats = {
    tickets: ticketsSold,
    attendance: attendedTickets || ticketsSold,
    revenueCents: ticketRevenueCents,
    capacity: totalCapacity,
    sellThroughPercent:
      totalCapacity > 0 ? Math.round((ticketsReserved / totalCapacity) * 100) : null,
    feedbackScore: feedback.averageOverall,
    photoCount: publicPhotos.length,
  }

  const circleConfig = normalizeDinnerCircleConfig(share.circle_config ?? null)
  const collaboratorInsights = buildCollaboratorInsights({
    reserved: ticketsReserved,
    capacity: totalCapacity,
    revenueCents: ticketRevenueCents,
    feedbackScore: feedback.averageOverall,
    publicPhotoCount: publicPhotos.length,
    ingredientCount: circleConfig.supplier?.ingredientLines?.length ?? 0,
    sourceCount: circleConfig.supplier?.sourceLinks?.length ?? 0,
    outcome,
  })

  // Get active addons
  const { data: addonRows } = await db
    .from('event_ticket_addons')
    .select('id, name, description, price_cents, max_per_ticket, total_capacity, sold_count')
    .eq('event_id', event.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const addons = (addonRows ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    description: a.description ?? null,
    priceCents: a.price_cents,
    maxPerTicket: a.max_per_ticket ?? null,
    remaining: a.total_capacity !== null ? Math.max(0, a.total_capacity - a.sold_count) : null,
  }))

  // Compute sale_status for each ticket type
  const now = new Date()

  return {
    eventId: event.id,
    tenantId: share.tenant_id as string,
    eventName: event.occasion || 'Event',
    status: event.status ?? null,
    lifecycleState: getPublicLifecycleState(event.status ?? null),
    eventDate: share.show_date !== false ? event.event_date : null,
    createdAt: event.created_at ?? null,
    serveTime: share.show_date !== false ? event.serve_time : null,
    locationText: share.show_location !== false ? locationText || null : null,
    guestCount: event.guest_count,
    occasion: event.occasion,
    chefName: share.show_chef_name !== false ? (chef?.business_name ?? null) : null,
    chefSlug: chef?.booking_slug ?? null,
    chefImageUrl: chef?.profile_image_url ?? null,
    collaborators: (collaboratorRows ?? [])
      .map((collaborator: any) => ({
        role: collaborator.role,
        businessName: collaborator.chef?.business_name ?? '',
      }))
      .filter((collaborator: any) => Boolean(collaborator.businessName)),
    menuDishes,
    ticketsSold,
    ticketsReserved,
    totalCapacity,
    ticketTypes: (ticketTypes ?? []).map((tt: any) => {
      let saleStatus: 'not_started' | 'early_access' | 'on_sale' | 'ended' = 'on_sale'
      if (tt.sale_ends_at && new Date(tt.sale_ends_at) <= now) saleStatus = 'ended'
      else if (tt.sale_starts_at) {
        const saleStart = new Date(tt.sale_starts_at)
        if (saleStart > now) {
          if (tt.early_access_minutes) {
            const earlyStart = new Date(saleStart.getTime() - tt.early_access_minutes * 60_000)
            saleStatus = earlyStart <= now ? 'early_access' : 'not_started'
          } else {
            saleStatus = 'not_started'
          }
        }
      }
      return {
        ...tt,
        remaining: tt.capacity !== null ? Math.max(0, tt.capacity - tt.sold_count) : null,
        sale_status: saleStatus,
      }
    }),
    addons,
    ticketsEnabled: share.tickets_enabled === true,
    showMenu: share.show_menu !== false,
    showDate: share.show_date !== false,
    showLocation: share.show_location !== false,
    showChefName: share.show_chef_name !== false,
    menuSummary,
    circleConfig,
    circle,
    feedback,
    hostStats,
    collaboratorInsights,
    publicPhotos,
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
    .select(
      'id, name, price_cents, capacity, sold_count, is_active, sale_starts_at, sale_ends_at, early_access_minutes'
    )
    .eq('id', validated.ticketTypeId)
    .eq('event_id', eventId)
    .single()

  if (!ticketType || !ticketType.is_active) {
    throw new Error('Ticket type not found or no longer available')
  }

  // ─── Timed Drop Enforcement ───────────────────────────────────────
  const now = new Date()

  if (ticketType.sale_ends_at && new Date(ticketType.sale_ends_at) <= now) {
    throw new Error('Ticket sales have ended for this tier')
  }

  if (ticketType.sale_starts_at) {
    const saleStart = new Date(ticketType.sale_starts_at)
    if (saleStart > now) {
      // Check early access for Circle members
      let hasEarlyAccess = false
      if (ticketType.early_access_minutes && validated.circleToken) {
        const earlyStart = new Date(saleStart.getTime() - ticketType.early_access_minutes * 60_000)
        if (earlyStart <= now) {
          // Verify circle membership
          const { data: circleCheck } = await db
            .from('hub_groups')
            .select('id')
            .eq('event_id', eventId)
            .eq('is_active', true)
            .maybeSingle()

          if (circleCheck) {
            const buyerEmailNorm = validated.buyerEmail.toLowerCase().trim()
            const { data: profile } = await db
              .from('hub_guest_profiles')
              .select('id')
              .eq('email_normalized', buyerEmailNorm)
              .maybeSingle()

            if (profile) {
              const { data: membership } = await db
                .from('hub_group_members')
                .select('id')
                .eq('group_id', circleCheck.id)
                .eq('profile_id', profile.id)
                .maybeSingle()

              if (membership) hasEarlyAccess = true
            }
          }
        }
      }

      if (!hasEarlyAccess) {
        const msUntilSale = saleStart.getTime() - now.getTime()
        const minutesUntil = Math.ceil(msUntilSale / 60_000)
        throw new Error(
          JSON.stringify({
            code: 'SALE_NOT_STARTED',
            saleStartsAt: ticketType.sale_starts_at,
            minutesUntilSale: minutesUntil,
            hasEarlyAccess: false,
          })
        )
      }
    }
  }

  await assertEventCapacityAvailable(db, eventId, validated.quantity)

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

  let reservationHeld = false

  // Optimistically reserve capacity (CAS guard)
  if (ticketType.capacity !== null) {
    const { data: reserved, error: casError } = await db
      .from('event_ticket_types')
      .update({ sold_count: ticketType.sold_count + validated.quantity })
      .eq('id', validated.ticketTypeId)
      .eq('sold_count', ticketType.sold_count) // CAS: only succeeds if nobody else sold between reads
      .select('id')
      .maybeSingle()

    if (casError || !reserved) {
      // CAS failed = someone else bought simultaneously. Clean up and fail.
      await db.from('event_tickets').delete().eq('id', ticket.id)
      throw new Error('Someone else just grabbed those seats. Please try again.')
    }

    reservationHeld = true
  }

  // ─── Process Add-Ons ────────────────────────────────────────────────
  const addonLineItems: AddonLineItem[] = []
  let addonTotalCents = 0

  if (validated.addons?.length) {
    for (const addonSel of validated.addons) {
      const { data: addon } = await db
        .from('event_ticket_addons')
        .select('id, name, price_cents, max_per_ticket, total_capacity, sold_count, is_active')
        .eq('id', addonSel.addonId)
        .eq('event_id', eventId)
        .single()

      if (!addon || !addon.is_active) continue

      if (addon.max_per_ticket && addonSel.quantity > addon.max_per_ticket) {
        throw new Error(`Maximum ${addon.max_per_ticket} of "${addon.name}" per ticket`)
      }

      if (addon.total_capacity !== null) {
        const remaining = addon.total_capacity - addon.sold_count
        if (addonSel.quantity > remaining) {
          throw new Error(
            remaining > 0
              ? `Only ${remaining} "${addon.name}" remaining`
              : `"${addon.name}" is sold out`
          )
        }
      }

      addonLineItems.push({
        addonId: addon.id,
        name: addon.name,
        priceCents: addon.price_cents,
        quantity: addonSel.quantity,
      })
      addonTotalCents += addon.price_cents * addonSel.quantity
    }
  }

  let session: Stripe.Checkout.Session
  try {
    session = await createCheckoutSessionForTicket({
      db,
      ticketId: ticket.id,
      shareToken: validated.shareToken,
      ticketType,
      eventId,
      tenantId,
      buyerEmail: validated.buyerEmail,
      quantity: validated.quantity,
      totalCents,
      addonLineItems,
    })
  } catch (checkoutError) {
    if (reservationHeld) {
      await releaseTicketTypeReservation(db, validated.ticketTypeId, validated.quantity)
    }
    await markTicketCheckoutFailed(
      db,
      ticket.id,
      checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be started'
    )
    throw new Error('Unable to start checkout. Please try again.')
  }

  // Store Stripe session ID on ticket
  await db
    .from('event_tickets')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', ticket.id)

  // Record addon purchases and reserve addon capacity
  if (addonLineItems.length > 0) {
    for (const item of addonLineItems) {
      await db.from('event_ticket_addon_purchases').insert({
        ticket_id: ticket.id,
        addon_id: item.addonId,
        quantity: item.quantity,
        unit_price_cents: item.priceCents,
        total_cents: item.priceCents * item.quantity,
      })

      // CAS reserve addon capacity
      const { data: addonRow } = await db
        .from('event_ticket_addons')
        .select('sold_count')
        .eq('id', item.addonId)
        .single()

      if (addonRow) {
        await db
          .from('event_ticket_addons')
          .update({ sold_count: addonRow.sold_count + item.quantity })
          .eq('id', item.addonId)
          .eq('sold_count', addonRow.sold_count)
      }
    }
  }

  const checkoutUrl = session.url
  if (!checkoutUrl) {
    throw new Error('Failed to create checkout session')
  }

  return {
    checkoutUrl,
    ticketId: ticket.id,
    totalCents: totalCents + addonTotalCents,
  }
}

export async function retryTicketPurchase(input: {
  shareToken: string
  ticketId: string
}): Promise<PurchaseTicketResult> {
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`ticket-retry:${ip}`, 10, 10 * 60_000)
  } catch {
    throw new Error('Too many retry attempts. Please try again in a few minutes.')
  }

  const db: any = createServerClient({ admin: true })

  const { data: share } = await db
    .from('event_share_settings')
    .select('event_id, tenant_id, tickets_enabled')
    .eq('share_token', input.shareToken)
    .single()

  if (!share || !share.tickets_enabled) {
    throw new Error('Tickets are not available for this event')
  }

  const { data: ticket } = await db
    .from('event_tickets')
    .select(
      'id, event_id, tenant_id, ticket_type_id, buyer_email, quantity, total_cents, payment_status, capacity_released_at'
    )
    .eq('id', input.ticketId)
    .eq('event_id', share.event_id)
    .single()

  if (!ticket) throw new Error('Ticket not found')
  if (ticket.payment_status === 'paid') throw new Error('This ticket has already been paid')
  if (!['pending', 'failed', 'cancelled'].includes(ticket.payment_status)) {
    throw new Error('This ticket cannot be retried')
  }
  if (!ticket.ticket_type_id) throw new Error('Ticket type is no longer available')

  const { data: ticketType } = await db
    .from('event_ticket_types')
    .select('id, name, price_cents, capacity, sold_count, is_active')
    .eq('id', ticket.ticket_type_id)
    .eq('event_id', share.event_id)
    .single()

  if (!ticketType || !ticketType.is_active) {
    throw new Error('Ticket type is no longer available')
  }

  let reservationHeld = false

  if (ticket.capacity_released_at) {
    await assertEventCapacityAvailable(db, share.event_id, ticket.quantity)

    if (
      ticketType.capacity !== null &&
      ticketType.sold_count + ticket.quantity > ticketType.capacity
    ) {
      throw new Error('This ticket type is now sold out')
    }

    const { data: reserved, error: reserveError } = await db
      .from('event_ticket_types')
      .update({ sold_count: ticketType.sold_count + ticket.quantity })
      .eq('id', ticket.ticket_type_id)
      .eq('sold_count', ticketType.sold_count)
      .select('id')
      .maybeSingle()

    if (reserveError || !reserved) {
      throw new Error('Someone else just grabbed those seats. Please try again.')
    }

    reservationHeld = true
  }

  let session: Stripe.Checkout.Session
  try {
    session = await createCheckoutSessionForTicket({
      db,
      ticketId: ticket.id,
      shareToken: input.shareToken,
      ticketType,
      eventId: share.event_id,
      tenantId: share.tenant_id as string,
      buyerEmail: ticket.buyer_email,
      quantity: ticket.quantity,
      totalCents: ticket.total_cents,
    })
  } catch (checkoutError) {
    if (reservationHeld) {
      await releaseTicketTypeReservation(db, ticket.ticket_type_id, ticket.quantity)
    }
    await markTicketCheckoutFailed(
      db,
      ticket.id,
      checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be restarted'
    )
    throw new Error('Unable to restart checkout. Please try again.')
  }

  const checkoutUrl = session.url
  if (!checkoutUrl) {
    throw new Error('Failed to create checkout session')
  }

  await db
    .from('event_tickets')
    .update({
      payment_status: 'pending',
      stripe_checkout_session_id: session.id,
      last_payment_error: null,
      retry_available_at: null,
      capacity_released_at: null,
    })
    .eq('id', ticket.id)

  return {
    checkoutUrl,
    ticketId: ticket.id,
    totalCents: ticket.total_cents,
  }
}

export async function joinTicketWaitlist(
  input: JoinTicketWaitlistInput
): Promise<{ success: boolean }> {
  const validated = JoinTicketWaitlistSchema.parse(input)
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  try {
    await checkRateLimit(`ticket-waitlist:${ip}`, 5, 10 * 60_000)
    await checkRateLimit(
      `ticket-waitlist-email:${validated.guestEmail.toLowerCase()}`,
      3,
      60 * 60_000
    )
  } catch {
    throw new Error('Too many waitlist attempts. Please try again later.')
  }

  const db: any = createServerClient({ admin: true })
  const { data: share } = await db
    .from('event_share_settings')
    .select('event_id, tenant_id')
    .eq('share_token', validated.shareToken)
    .single()

  if (!share) throw new Error('Event not found')

  const { data: event } = await db
    .from('events')
    .select('event_date, occasion')
    .eq('id', share.event_id)
    .single()

  if (!event?.event_date) throw new Error('Event is not waitlistable')

  const notes = [
    validated.notes?.trim() || null,
    `Guest: ${validated.guestName.trim()} <${validated.guestEmail.toLowerCase().trim()}>`,
    `Ticket waitlist for ${event.occasion || 'event'} (${validated.quantity} seat${
      validated.quantity === 1 ? '' : 's'
    })`,
  ]
    .filter(Boolean)
    .join('\n')

  const waitlistEntry = {
    chef_id: share.tenant_id,
    requested_date: event.event_date,
    occasion: event.occasion || 'Ticketed event waitlist',
    guest_count_estimate: validated.quantity,
    notes,
    guest_name: validated.guestName.trim(),
    guest_email: validated.guestEmail.toLowerCase().trim(),
    source_event_id: share.event_id,
    status: 'waiting',
  }

  const { error } = await db.from('waitlist_entries').insert(waitlistEntry)

  if (error) {
    const missingGuestColumns =
      error.code === '42703' || /guest_name|guest_email|source_event_id/i.test(error.message || '')

    if (!missingGuestColumns) {
      throw new Error('Could not join the waitlist. Please try again.')
    }

    const { error: fallbackError } = await db.from('waitlist_entries').insert({
      chef_id: waitlistEntry.chef_id,
      requested_date: waitlistEntry.requested_date,
      occasion: waitlistEntry.occasion,
      guest_count_estimate: waitlistEntry.guest_count_estimate,
      notes: waitlistEntry.notes,
      status: waitlistEntry.status,
    })

    if (fallbackError) {
      throw new Error('Could not join the waitlist. Please try again.')
    }
  }

  return { success: true }
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
    .select(
      'occasion, event_date, serve_time, location_address, location_city, location_state, location_zip'
    )
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
