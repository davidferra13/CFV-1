// Client Relationship Summary Generator
// Aggregates all client data into a single printable/exportable report.
// NOT a server action file; called by client-summary-actions.ts.

import { createServerClient } from '@/lib/db/server'
import { dateToDateString } from '@/lib/utils/format'

// ── Types ────────────────────────────────────────────────────────────────────

export type ClientSummaryEvent = {
  eventId: string
  occasion: string | null
  eventDate: string
  guestCount: number | null
  status: string
  revenueCents: number
  menuSummary: string | null
}

export type ClientSummaryFinancials = {
  totalSpentCents: number
  averagePerEventCents: number
  totalPaymentsCents: number
  outstandingBalanceCents: number
  paymentHistory: Array<{
    date: string
    amountCents: number
    method: string | null
    type: string
  }>
}

export type ClientSummaryPreferences = {
  dietaryRestrictions: string[]
  allergies: string[]
  favoriteDishes: string[]
  favoriteCuisines: string[]
  preferredServiceStyle: string | null
  typicalGuestCount: number | null
}

export type ClientSummaryReview = {
  eventId: string
  occasion: string | null
  eventDate: string
  rating: number
  feedbackText: string | null
  whatTheyLoved: string | null
  whatCouldImprove: string | null
}

export type ClientSummaryCommunication = {
  totalInteractions: number
  lastContactDate: string | null
  recentItems: Array<{
    date: string
    type: string
    title: string
    description: string | null
  }>
}

export type ClientSummaryReport = {
  // Client identity
  clientId: string
  fullName: string
  email: string | null
  phone: string | null
  clientSince: string
  status: string

  // Event history
  events: ClientSummaryEvent[]
  totalEventsCompleted: number
  upcomingEventsCount: number

  // Financials
  financials: ClientSummaryFinancials

  // Preferences
  preferences: ClientSummaryPreferences

  // Reviews
  reviews: ClientSummaryReview[]
  averageRating: number | null

  // Communication
  communication: ClientSummaryCommunication

  // Notes
  notes: Array<{
    date: string
    text: string
    pinned: boolean
  }>

  // Metadata
  generatedAt: string
}

// ── Generator ────────────────────────────────────────────────────────────────

export async function generateClientSummary(
  clientId: string,
  tenantId: string
): Promise<ClientSummaryReport> {
  const db: any = createServerClient()

  // Parallel-fetch all data sources
  const [
    clientResult,
    eventsResult,
    financialsResult,
    ledgerResult,
    reviewsResult,
    messagesResult,
    notesResult,
  ] = await Promise.all([
    // Client profile
    db
      .from('clients')
      .select(
        'id, full_name, email, phone, created_at, status, dietary_restrictions, allergies, favorite_dishes, favorite_cuisines, preferred_service_style, typical_guest_count'
      )
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single(),

    // Events
    db
      .from('events')
      .select('id, occasion, event_date, guest_count, status, quoted_price_cents')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('event_date', { ascending: false }),

    // Financial summaries per event
    db
      .from('event_financial_summary')
      .select('event_id, total_paid_cents, outstanding_balance_cents, net_revenue_cents')
      .eq('tenant_id', tenantId),

    // Ledger entries (payments)
    db
      .from('ledger_entries')
      .select('id, created_at, received_at, amount_cents, payment_method, entry_type')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50),

    // Reviews
    db
      .from('client_reviews')
      .select('id, event_id, rating, feedback_text, what_they_loved, what_could_improve, created_at, events!inner(occasion, event_date)')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),

    // Messages (communication history)
    db
      .from('messages')
      .select('id, created_at, sent_at, channel, direction, subject, body')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Notes
    db
      .from('client_notes')
      .select('id, created_at, note_text, pinned')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const client = clientResult.data
  if (!client) {
    throw new Error('Client not found')
  }

  // Build event financial map
  const finMap = new Map<string, { paidCents: number; outstandingCents: number; revenueCents: number }>()
  for (const f of financialsResult.data ?? []) {
    if (!f.event_id) continue
    finMap.set(f.event_id, {
      paidCents: f.total_paid_cents ?? 0,
      outstandingCents: f.outstanding_balance_cents ?? 0,
      revenueCents: f.net_revenue_cents ?? 0,
    })
  }

  // Process events
  const allEvents = (eventsResult.data ?? []) as Array<{
    id: string
    occasion: string | null
    event_date: string
    guest_count: number | null
    status: string
    quoted_price_cents: number | null
  }>

  const clientEventIds = new Set(allEvents.map((e) => e.id))

  const events: ClientSummaryEvent[] = allEvents.map((e) => {
    const fin = finMap.get(e.id)
    return {
      eventId: e.id,
      occasion: e.occasion,
      eventDate: dateToDateString(e.event_date),
      guestCount: e.guest_count,
      status: e.status,
      revenueCents: fin?.revenueCents ?? e.quoted_price_cents ?? 0,
      menuSummary: null,
    }
  })

  const completedEvents = events.filter((e) => e.status === 'completed')
  const upcomingEvents = events.filter((e) =>
    ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress'].includes(e.status)
  )

  // Financials
  const totalSpentCents = completedEvents.reduce((s, e) => s + e.revenueCents, 0)
  const averagePerEventCents =
    completedEvents.length > 0 ? Math.round(totalSpentCents / completedEvents.length) : 0

  const paymentEntries = (ledgerResult.data ?? []) as Array<{
    id: string
    created_at: string
    received_at: string | null
    amount_cents: number
    payment_method: string | null
    entry_type: string
  }>

  const totalPaymentsCents = paymentEntries
    .filter((p) => p.entry_type !== 'refund')
    .reduce((s, p) => s + Math.abs(p.amount_cents), 0)

  // Outstanding balance: sum from financial summaries for this client's events
  let outstandingBalanceCents = 0
  for (const [eventId, fin] of finMap) {
    if (clientEventIds.has(eventId)) {
      outstandingBalanceCents += fin.outstandingCents
    }
  }

  const financials: ClientSummaryFinancials = {
    totalSpentCents,
    averagePerEventCents,
    totalPaymentsCents,
    outstandingBalanceCents,
    paymentHistory: paymentEntries.slice(0, 20).map((p) => ({
      date: p.received_at ?? p.created_at,
      amountCents: p.amount_cents,
      method: p.payment_method,
      type: p.entry_type,
    })),
  }

  // Preferences
  const preferences: ClientSummaryPreferences = {
    dietaryRestrictions: parseStringArray(client.dietary_restrictions),
    allergies: parseStringArray(client.allergies),
    favoriteDishes: parseStringArray(client.favorite_dishes),
    favoriteCuisines: parseStringArray(client.favorite_cuisines),
    preferredServiceStyle: client.preferred_service_style ?? null,
    typicalGuestCount: client.typical_guest_count ?? null,
  }

  // Reviews
  const reviewRows = (reviewsResult.data ?? []) as Array<{
    id: string
    event_id: string
    rating: number
    feedback_text: string | null
    what_they_loved: string | null
    what_could_improve: string | null
    events: { occasion: string | null; event_date: string }
  }>

  const reviews: ClientSummaryReview[] = reviewRows.map((r) => ({
    eventId: r.event_id,
    occasion: r.events?.occasion ?? null,
    eventDate: r.events?.event_date ? dateToDateString(r.events.event_date) : '',
    rating: r.rating,
    feedbackText: r.feedback_text ?? null,
    whatTheyLoved: r.what_they_loved ?? null,
    whatCouldImprove: r.what_could_improve ?? null,
  }))

  const averageRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null

  // Communication
  const msgRows = (messagesResult.data ?? []) as Array<{
    id: string
    created_at: string
    sent_at: string | null
    channel: string | null
    direction: string
    subject: string | null
    body: string | null
  }>

  const recentComms = msgRows.map((m) => ({
    date: m.sent_at ?? m.created_at,
    type: m.direction === 'inbound' ? 'Client message' : 'Chef message',
    title: m.subject ?? (m.direction === 'inbound' ? 'Client messaged' : 'You messaged client'),
    description: m.body ? (m.body.length > 80 ? m.body.slice(0, 80) + '...' : m.body) : null,
  }))

  const communication: ClientSummaryCommunication = {
    totalInteractions: msgRows.length,
    lastContactDate: msgRows.length > 0 ? msgRows[0].sent_at ?? msgRows[0].created_at : null,
    recentItems: recentComms.slice(0, 5),
  }

  // Notes
  const noteRows = (notesResult.data ?? []) as Array<{
    id: string
    created_at: string
    note_text: string
    pinned: boolean
  }>

  const notes = noteRows.map((n) => ({
    date: n.created_at,
    text: n.note_text,
    pinned: n.pinned ?? false,
  }))

  return {
    clientId: client.id,
    fullName: client.full_name,
    email: client.email ?? null,
    phone: client.phone ?? null,
    clientSince: client.created_at,
    status: client.status ?? 'active',

    events,
    totalEventsCompleted: completedEvents.length,
    upcomingEventsCount: upcomingEvents.length,

    financials,
    preferences,
    reviews,
    averageRating,
    communication,
    notes,

    generatedAt: new Date().toISOString(),
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string')
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return val ? [val] : []
    }
  }
  return []
}
