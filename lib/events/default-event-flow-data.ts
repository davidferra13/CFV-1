import { createServerClient } from '@/lib/db/server'
import { getEventPricingIntelligence } from '@/lib/finance/event-pricing-intelligence-actions'
import {
  buildEventDefaultFlowSnapshot,
  type EventDefaultFlowInput,
  type EventDefaultFlowSnapshot,
  type SimilarEventPricingSignal,
} from '@/lib/events/default-event-flow'
import type { EventTicket, EventTicketSummary, EventTicketType } from '@/lib/tickets/types'

function numberOrZero(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

async function getSimilarPricingSignal(params: {
  db: any
  tenantId: string
  eventId: string
  serviceStyle: string | null
}): Promise<SimilarEventPricingSignal> {
  const { data: rows } = await params.db
    .from('events')
    .select('id, guest_count, quoted_price_cents, service_style')
    .eq('tenant_id', params.tenantId)
    .eq('status', 'completed')
    .neq('id', params.eventId)
    .limit(20)

  const filtered = ((rows ?? []) as any[]).filter((row) => {
    if (!params.serviceStyle) return true
    return row.service_style == null || row.service_style === params.serviceStyle
  })
  const perGuestValues = filtered
    .map((row) => {
      const quoted = numberOrZero(row.quoted_price_cents)
      const guests = numberOrZero(row.guest_count)
      return quoted > 0 && guests > 0 ? Math.round(quoted / guests) : 0
    })
    .filter((value) => value > 0)

  const eventIds = filtered.map((row) => row.id).filter(Boolean)
  let averageMarginPercent: number | null = null
  if (eventIds.length > 0) {
    const { data: summaries } = await params.db
      .from('event_financial_summary')
      .select('profit_margin')
      .in('event_id', eventIds)
      .limit(20)
    averageMarginPercent = average(
      ((summaries ?? []) as any[])
        .map((summary) => Number(summary.profit_margin))
        .filter((value) => Number.isFinite(value))
    )
  }

  return {
    sampleSize: perGuestValues.length,
    averagePricePerGuestCents:
      perGuestValues.length > 0 ? Math.round(average(perGuestValues) ?? 0) : null,
    averageMarginPercent,
  }
}

async function getTrustSignals(db: any, tenantId: string) {
  const { count: pastEventsCount } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')

  const { data: ticketRows } = await db
    .from('event_tickets')
    .select('attended, payment_status')
    .eq('tenant_id', tenantId)
    .eq('payment_status', 'paid')
    .limit(500)

  const paidTickets = (ticketRows ?? []) as any[]
  const attendedKnown = paidTickets.filter((ticket) => ticket.attended !== null)
  const attendedCount = attendedKnown.filter((ticket) => ticket.attended === true).length

  return {
    pastEventsCount: pastEventsCount ?? 0,
    completedTicketedEventsCount: paidTickets.length,
    attendanceConsistencyPercent:
      attendedKnown.length > 0 ? Math.round((attendedCount / attendedKnown.length) * 100) : null,
  }
}

export async function getEventDefaultFlowSnapshotForTenant(
  eventId: string,
  tenantId: string,
  options?: {
    pricing?: EventDefaultFlowInput['pricing']
    db?: any
  }
): Promise<EventDefaultFlowSnapshot | null> {
  const db: any = options?.db ?? createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      [
        'id',
        'status',
        'event_date',
        'serve_time',
        'arrival_time',
        'guest_count',
        'service_style',
        'quoted_price_cents',
        'location_address',
        'location_city',
        'location_notes',
        'access_instructions',
        'kitchen_notes',
        'site_notes',
        'course_count',
        'travel_time_minutes',
        'client_reminder_7d_sent_at',
        'client_reminder_2d_sent_at',
        'client_reminder_1d_sent_at',
        'review_request_sent_at',
      ].join(', ')
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!event) return null

  const [
    menusRes,
    ticketTypesRes,
    ticketsRes,
    ticketSummaryRes,
    guestSummaryRes,
    guestRowsRes,
    staffRes,
    collaboratorRes,
    messageRes,
    shareRes,
    hubGroupRes,
    photoRes,
    surveyRes,
    similarPricing,
    trust,
  ] = await Promise.all([
    db
      .from('menu_cost_summary')
      .select('menu_id, has_all_recipe_costs')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .limit(20),
    db
      .from('event_ticket_types')
      .select('*')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true }),
    db
      .from('event_tickets')
      .select('*')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .neq('payment_status', 'cancelled'),
    db
      .from('event_ticket_summary')
      .select('*')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    db
      .from('event_guest_summary')
      .select('*')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    db
      .from('event_guests')
      .select('id, email, actual_attended')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .limit(500),
    db
      .from('event_staff_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('chef_id', tenantId),
    db
      .from('event_collaborators')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'accepted'),
    db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId),
    db
      .from('event_shares')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    db
      .from('hub_groups')
      .select('id, message_count')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    db
      .from('event_photos')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .eq('is_public', true)
      .is('deleted_at', null),
    db
      .from('post_event_surveys')
      .select('sent_at, completed_at, overall')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    getSimilarPricingSignal({
      db,
      tenantId,
      eventId,
      serviceStyle: event.service_style ?? null,
    }).catch(() => ({
      sampleSize: 0,
      averagePricePerGuestCents: null,
      averageMarginPercent: null,
    })),
    getTrustSignals(db, tenantId).catch(() => ({
      pastEventsCount: 0,
      completedTicketedEventsCount: 0,
      attendanceConsistencyPercent: null,
    })),
  ])

  const menuRows = (menusRes.data ?? []) as any[]
  const guestRows = (guestRowsRes.data ?? []) as any[]
  const guestEmails = guestRows
    .map((guest) => (typeof guest.email === 'string' ? guest.email.toLowerCase().trim() : null))
    .filter(Boolean) as string[]

  let repeatGuests = 0
  if (guestEmails.length > 0) {
    const { data: priorGuests } = await db
      .from('event_guests')
      .select('email')
      .eq('tenant_id', tenantId)
      .neq('event_id', eventId)
      .in('email', guestEmails)
      .limit(500)
    repeatGuests = new Set(
      ((priorGuests ?? []) as any[])
        .map((guest) => (typeof guest.email === 'string' ? guest.email.toLowerCase().trim() : null))
        .filter(Boolean)
    ).size
  }

  const pricing =
    options?.pricing === undefined
      ? await getEventPricingIntelligence(eventId).catch(() => null)
      : options.pricing

  const input: EventDefaultFlowInput = {
    event: {
      id: event.id,
      status: event.status,
      eventDate: event.event_date ?? null,
      serveTime: event.serve_time ?? null,
      arrivalTime: event.arrival_time ?? null,
      guestCount: event.guest_count ?? null,
      serviceStyle: event.service_style ?? null,
      quotedPriceCents: event.quoted_price_cents ?? null,
      locationAddress: event.location_address ?? null,
      locationCity: event.location_city ?? null,
      locationNotes: event.location_notes ?? null,
      accessInstructions: event.access_instructions ?? null,
      kitchenNotes: event.kitchen_notes ?? null,
      siteNotes: event.site_notes ?? null,
      courseCount: event.course_count ?? null,
      travelTimeMinutes: event.travel_time_minutes ?? null,
      clientReminder7dSentAt: event.client_reminder_7d_sent_at ?? null,
      clientReminder2dSentAt: event.client_reminder_2d_sent_at ?? null,
      clientReminder1dSentAt: event.client_reminder_1d_sent_at ?? null,
      reviewRequestSentAt: event.review_request_sent_at ?? null,
    },
    hasMenu: menuRows.length > 0,
    menuHasAllRecipeCosts:
      menuRows.length > 0 ? menuRows.every((row) => row.has_all_recipe_costs === true) : null,
    publicPhotoCount: (photoRes.data ?? []).length,
    staffCount: staffRes.count ?? 0,
    collaboratorCount: collaboratorRes.count ?? 0,
    messageCount: messageRes.count ?? 0,
    activeShare: Boolean(shareRes.data),
    hubThreadActive: Boolean(hubGroupRes.data),
    guestSummary: {
      totalGuests: numberOrZero(guestSummaryRes.data?.total_guests),
      attending: numberOrZero(guestSummaryRes.data?.attending_count),
      waitlisted: numberOrZero(guestSummaryRes.data?.waitlisted_count),
      arrived: guestRows.filter((guest) => guest.actual_attended === 'attended').length,
      repeatGuests,
    },
    tickets: {
      ticketTypes: (ticketTypesRes.data ?? []) as EventTicketType[],
      tickets: (ticketsRes.data ?? []) as EventTicket[],
      summary: (ticketSummaryRes.data ?? null) as EventTicketSummary | null,
    },
    pricing,
    similarPricing,
    feedback: {
      surveySent: Boolean(surveyRes.data?.sent_at),
      surveyCompleted: Boolean(surveyRes.data?.completed_at),
      averageRating: surveyRes.data?.overall ? Number(surveyRes.data.overall) : null,
    },
    trust,
  }

  return buildEventDefaultFlowSnapshot(input)
}
