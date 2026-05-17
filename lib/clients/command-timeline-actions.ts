'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { addClientNote } from '@/lib/notes/actions'
import type {
  TimelineEntry,
  TimelineEventType,
  TimelineFilter,
  ClientTimeline,
} from './command-timeline-types'

// ---------------------------------------------------------------------------
// Mapping helpers: convert interaction-ledger codes to command-timeline types
// ---------------------------------------------------------------------------

const CODE_TO_TYPE: Record<string, TimelineEventType> = {
  inquiry_received: 'inquiry_received',
  inquiry_waiting_on_client: 'inquiry_received',
  inquiry_waiting_on_chef: 'inquiry_received',
  inquiry_quoted: 'inquiry_received',
  inquiry_confirmed: 'inquiry_received',
  inquiry_declined: 'inquiry_received',
  inquiry_expired: 'inquiry_received',
  quote_created: 'quote_sent',
  quote_sent: 'quote_sent',
  quote_accepted: 'quote_accepted',
  quote_rejected: 'quote_rejected',
  payment_recorded: 'payment_received',
  refund_recorded: 'payment_received',
  event_drafted: 'event_completed',
  event_proposed: 'event_completed',
  event_accepted: 'event_completed',
  event_paid: 'deposit_paid',
  event_confirmed: 'event_completed',
  event_in_progress: 'event_completed',
  event_completed: 'event_completed',
  event_cancelled: 'event_completed',
  client_review_submitted: 'feedback_received',
  note_recorded: 'note_added',
  client_message_received: 'communication_sent',
  chef_message_sent: 'communication_sent',
  menu_proposed: 'menu_approved',
  menu_revision_created: 'menu_changed',
  menu_feedback_recorded: 'menu_changed',
  menu_allergen_revision_created: 'menu_changed',
  comm_email_sent: 'communication_sent',
  comm_email_received: 'communication_sent',
  comm_sms_sent: 'communication_sent',
  comm_sms_received: 'communication_sent',
  comm_phone_logged: 'communication_sent',
  comm_system_entry: 'communication_sent',
  outreach_email_sent: 'communication_sent',
  outreach_sms_sent: 'communication_sent',
  outreach_call_noted: 'communication_sent',
  outreach_instagram_noted: 'communication_sent',
  scheduled_message_pending: 'communication_sent',
  scheduled_message_sent: 'communication_sent',
  scheduled_message_failed: 'communication_sent',
  document_revision_saved: 'menu_changed',
  portal_session_started: 'communication_sent',
  event_viewed: 'communication_sent',
  quote_viewed: 'communication_sent',
  invoice_viewed: 'communication_sent',
  proposal_viewed: 'communication_sent',
  client_message_sent_from_portal: 'communication_sent',
  rsvp_submitted: 'communication_sent',
  client_form_submitted: 'communication_sent',
  payment_page_viewed: 'communication_sent',
  document_downloaded: 'communication_sent',
  public_profile_viewed: 'communication_sent',
}

function ledgerEntryTypeToPaymentType(entryType: string | null): TimelineEventType {
  if (entryType === 'tip') return 'tip_received'
  if (entryType === 'deposit') return 'deposit_paid'
  return 'payment_received'
}

// ---------------------------------------------------------------------------
// 1. getClientTimeline
// ---------------------------------------------------------------------------

export async function getClientTimeline(
  clientId: string,
  filters?: TimelineFilter,
  limit: number = 100
): Promise<ClientTimeline> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch client info
  const { data: client } = await db
    .from('clients')
    .select('id, full_name')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) {
    return {
      client_id: clientId,
      client_name: 'Unknown',
      first_contact: null,
      total_events: 0,
      total_revenue_cents: 0,
      entries: [],
    }
  }

  // Pull raw data from each source table in parallel
  const [
    eventsRes,
    inquiriesRes,
    quotesRes,
    ledgerRes,
    notesRes,
    messagesRes,
    commLogRes,
    reviewsRes,
    contractsRes,
  ] = await Promise.all([
    db
      .from('events')
      .select('id, created_at, event_date, status, occasion, guest_count, quoted_price_cents')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('inquiries')
      .select('id, created_at, first_contact_at, status, channel')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('quotes')
      .select(
        'id, created_at, sent_at, accepted_at, rejected_at, status, quote_name, total_quoted_cents, event_id'
      )
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .is('deleted_at' as any, null)
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('ledger_entries')
      .select(
        'id, created_at, received_at, entry_type, amount_cents, payment_method, description, event_id'
      )
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('client_notes')
      .select('id, created_at, note_text, category, event_id')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('messages')
      .select('id, created_at, sent_at, channel, direction, body, subject')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('communication_log')
      .select('id, created_at, channel, direction, subject, content')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('client_reviews')
      .select('id, created_at, rating, what_they_loved')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('contracts')
      .select('id, created_at, sent_at, signed_at, status, event_id')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then((r: any) => r)
      .catch(() => ({ data: [] })),
  ])

  const entries: TimelineEntry[] = []

  // --- Inquiries ---
  for (const row of (inquiriesRes.data ?? []) as any[]) {
    entries.push({
      id: `inquiry:${row.id}`,
      type: 'inquiry_received',
      title: 'Inquiry received',
      description: row.channel ? `via ${row.channel}` : null,
      event_id: null,
      metadata: { inquiry_id: row.id, status: row.status, channel: row.channel },
      occurred_at: row.first_contact_at ?? row.created_at,
    })
  }

  // --- Quotes ---
  for (const row of (quotesRes.data ?? []) as any[]) {
    const cents = row.total_quoted_cents
    const label = row.quote_name ?? 'Quote'
    if (row.status === 'sent' || row.sent_at) {
      entries.push({
        id: `quote_sent:${row.id}`,
        type: 'quote_sent',
        title: `Quote sent: ${label}`,
        description: cents ? `$${(cents / 100).toFixed(0)}` : null,
        event_id: row.event_id ?? null,
        metadata: { quote_id: row.id, amount_cents: cents },
        occurred_at: row.sent_at ?? row.created_at,
      })
    }
    if (row.status === 'accepted' && row.accepted_at) {
      entries.push({
        id: `quote_accepted:${row.id}`,
        type: 'quote_accepted',
        title: `Quote accepted: ${label}`,
        description: cents ? `$${(cents / 100).toFixed(0)}` : null,
        event_id: row.event_id ?? null,
        metadata: { quote_id: row.id, amount_cents: cents },
        occurred_at: row.accepted_at,
      })
    }
    if (row.status === 'rejected' && row.rejected_at) {
      entries.push({
        id: `quote_rejected:${row.id}`,
        type: 'quote_rejected',
        title: `Quote rejected: ${label}`,
        description: null,
        event_id: row.event_id ?? null,
        metadata: { quote_id: row.id },
        occurred_at: row.rejected_at,
      })
    }
  }

  // --- Contracts ---
  for (const row of (contractsRes.data ?? []) as any[]) {
    if (row.sent_at) {
      entries.push({
        id: `contract_sent:${row.id}`,
        type: 'contract_sent',
        title: 'Contract sent',
        description: null,
        event_id: row.event_id ?? null,
        metadata: { contract_id: row.id },
        occurred_at: row.sent_at,
      })
    }
    if (row.signed_at) {
      entries.push({
        id: `contract_signed:${row.id}`,
        type: 'contract_signed',
        title: 'Contract signed',
        description: null,
        event_id: row.event_id ?? null,
        metadata: { contract_id: row.id },
        occurred_at: row.signed_at,
      })
    }
  }

  // --- Ledger entries (payments, deposits, tips) ---
  for (const row of (ledgerRes.data ?? []) as any[]) {
    const paymentType = ledgerEntryTypeToPaymentType(row.entry_type)
    const cents = Math.abs(row.amount_cents ?? 0)
    const label =
      paymentType === 'tip_received'
        ? 'Tip received'
        : paymentType === 'deposit_paid'
          ? 'Deposit received'
          : 'Payment received'
    entries.push({
      id: `ledger:${row.id}`,
      type: paymentType,
      title: label,
      description: cents
        ? `$${(cents / 100).toFixed(0)}${row.payment_method ? ` via ${row.payment_method}` : ''}`
        : (row.description ?? null),
      event_id: row.event_id ?? null,
      metadata: { ledger_id: row.id, amount_cents: row.amount_cents, entry_type: row.entry_type },
      occurred_at: row.received_at ?? row.created_at,
    })
  }

  // --- Events ---
  for (const row of (eventsRes.data ?? []) as any[]) {
    if (row.status === 'completed') {
      entries.push({
        id: `event_completed:${row.id}`,
        type: 'event_completed',
        title: `Event completed: ${row.occasion ?? 'Dinner'}`,
        description: row.guest_count ? `${row.guest_count} guests` : null,
        event_id: row.id,
        metadata: { event_id: row.id, guest_count: row.guest_count, occasion: row.occasion },
        occurred_at: row.event_date ?? row.created_at,
      })
    }
  }

  // --- Notes ---
  for (const row of (notesRes.data ?? []) as any[]) {
    entries.push({
      id: `note:${row.id}`,
      type: 'note_added',
      title: 'Note added',
      description: row.note_text
        ? row.note_text.length > 120
          ? row.note_text.slice(0, 120) + '...'
          : row.note_text
        : null,
      event_id: row.event_id ?? null,
      metadata: { note_id: row.id, category: row.category },
      occurred_at: row.created_at,
    })
  }

  // --- Messages ---
  for (const row of (messagesRes.data ?? []) as any[]) {
    entries.push({
      id: `message:${row.id}`,
      type: 'communication_sent',
      title: row.direction === 'inbound' ? 'Client messaged' : 'Message sent to client',
      description: row.subject
        ? row.subject.slice(0, 120)
        : row.body
          ? row.body.slice(0, 120)
          : null,
      event_id: null,
      metadata: { message_id: row.id, channel: row.channel, direction: row.direction },
      occurred_at: row.sent_at ?? row.created_at,
    })
  }

  // --- Communication log ---
  for (const row of (commLogRes.data ?? []) as any[]) {
    entries.push({
      id: `comm:${row.id}`,
      type: 'communication_sent',
      title: row.direction === 'inbound' ? `${row.channel} received` : `${row.channel} sent`,
      description: row.subject
        ? row.subject.slice(0, 120)
        : row.content
          ? row.content.slice(0, 120)
          : null,
      event_id: null,
      metadata: { comm_id: row.id, channel: row.channel, direction: row.direction },
      occurred_at: row.created_at,
    })
  }

  // --- Reviews ---
  for (const row of (reviewsRes.data ?? []) as any[]) {
    entries.push({
      id: `review:${row.id}`,
      type: 'feedback_received',
      title: `Feedback received${row.rating ? ` (${row.rating}/5)` : ''}`,
      description: row.what_they_loved ? row.what_they_loved.slice(0, 120) : null,
      event_id: null,
      metadata: { review_id: row.id, rating: row.rating },
      occurred_at: row.created_at,
    })
  }

  // --- Apply filters ---
  let filtered = entries

  if (filters?.types && filters.types.length > 0) {
    const typeSet = new Set(filters.types)
    filtered = filtered.filter((e) => typeSet.has(e.type))
  }
  if (filters?.from_date) {
    const from = new Date(filters.from_date).getTime()
    filtered = filtered.filter((e) => new Date(e.occurred_at).getTime() >= from)
  }
  if (filters?.to_date) {
    const to = new Date(filters.to_date).getTime()
    filtered = filtered.filter((e) => new Date(e.occurred_at).getTime() <= to)
  }
  if (filters?.event_id) {
    filtered = filtered.filter((e) => e.event_id === filters.event_id)
  }

  // Sort descending by occurred_at
  filtered.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

  // Compute summary stats
  const allEvents = (eventsRes.data ?? []) as any[]
  const totalRevenueCents = ((ledgerRes.data ?? []) as any[])
    .filter((le: any) => (le.amount_cents ?? 0) > 0)
    .reduce((sum: number, le: any) => sum + (le.amount_cents ?? 0), 0)

  const firstContactDates: string[] = []
  for (const inq of (inquiriesRes.data ?? []) as any[]) {
    if (inq.first_contact_at) firstContactDates.push(inq.first_contact_at)
    if (inq.created_at) firstContactDates.push(inq.created_at)
  }
  firstContactDates.sort()

  return {
    client_id: clientId,
    client_name: client.full_name ?? 'Unknown',
    first_contact: firstContactDates[0] ?? null,
    total_events: allEvents.length,
    total_revenue_cents: totalRevenueCents,
    entries: filtered.slice(0, limit),
  }
}

// ---------------------------------------------------------------------------
// 2. getClientTimelineSummary
// ---------------------------------------------------------------------------

export async function getClientTimelineSummary(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const [clientRes, eventsRes, ledgerRes, inquiriesRes, lastActivityRes] = await Promise.all([
    db
      .from('clients')
      .select('id, full_name, created_at')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('events')
      .select('id, event_date, status')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('event_date', { ascending: false }),
    db
      .from('ledger_entries')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId),
    db
      .from('inquiries')
      .select('first_contact_at, created_at')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(1),
    db
      .from('communication_log')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const client = clientRes.data
  if (!client) return null

  const events = (eventsRes.data ?? []) as any[]
  const totalRevenueCents = ((ledgerRes.data ?? []) as any[])
    .filter((le: any) => (le.amount_cents ?? 0) > 0)
    .reduce((sum: number, le: any) => sum + (le.amount_cents ?? 0), 0)

  const firstInquiry = (inquiriesRes.data ?? [])[0] as any | undefined
  const firstContact =
    firstInquiry?.first_contact_at ?? firstInquiry?.created_at ?? client.created_at

  const lastActivity = (lastActivityRes.data ?? [])[0] as any | undefined
  const lastEventDate = events[0]?.event_date ?? null

  return {
    client_id: clientId,
    client_name: client.full_name,
    first_contact: firstContact,
    total_events: events.length,
    total_revenue_cents: totalRevenueCents,
    last_interaction: lastActivity?.created_at ?? lastEventDate ?? null,
  }
}

// ---------------------------------------------------------------------------
// 3. getRecentClientActivity
// ---------------------------------------------------------------------------

export async function getRecentClientActivity(limit: number = 20) {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Pull recent entries across multiple tables, join client names
  const [eventsRes, quotesRes, ledgerRes, commRes] = await Promise.all([
    db
      .from('events')
      .select('id, created_at, event_date, status, occasion, client_id, clients(full_name)')
      .eq('tenant_id', tenantId)
      .in('status', ['completed', 'confirmed', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('quotes')
      .select(
        'id, created_at, sent_at, status, quote_name, total_quoted_cents, client_id, clients(full_name)'
      )
      .eq('tenant_id', tenantId)
      .is('deleted_at' as any, null)
      .in('status', ['sent', 'accepted', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('ledger_entries')
      .select(
        'id, created_at, received_at, entry_type, amount_cents, client_id, clients(full_name)'
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('communication_log')
      .select('id, created_at, channel, direction, subject, client_id, clients(full_name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const entries: (TimelineEntry & { client_id: string; client_name: string })[] = []

  for (const row of (eventsRes.data ?? []) as any[]) {
    entries.push({
      id: `event:${row.id}`,
      type: 'event_completed',
      title: `${row.occasion ?? 'Event'} (${row.status})`,
      description: null,
      event_id: row.id,
      metadata: { client_id: row.client_id },
      occurred_at: row.event_date ?? row.created_at,
      client_id: row.client_id,
      client_name: row.clients?.full_name ?? 'Unknown',
    })
  }

  for (const row of (quotesRes.data ?? []) as any[]) {
    const typeMap: Record<string, TimelineEventType> = {
      sent: 'quote_sent',
      accepted: 'quote_accepted',
      rejected: 'quote_rejected',
    }
    entries.push({
      id: `quote:${row.id}`,
      type: typeMap[row.status] ?? 'quote_sent',
      title: `Quote ${row.status}: ${row.quote_name ?? 'Untitled'}`,
      description: row.total_quoted_cents ? `$${(row.total_quoted_cents / 100).toFixed(0)}` : null,
      event_id: null,
      metadata: { client_id: row.client_id },
      occurred_at: row.sent_at ?? row.created_at,
      client_id: row.client_id,
      client_name: row.clients?.full_name ?? 'Unknown',
    })
  }

  for (const row of (ledgerRes.data ?? []) as any[]) {
    const cents = Math.abs(row.amount_cents ?? 0)
    entries.push({
      id: `ledger:${row.id}`,
      type: ledgerEntryTypeToPaymentType(row.entry_type),
      title: `${row.entry_type ?? 'Payment'} recorded`,
      description: cents ? `$${(cents / 100).toFixed(0)}` : null,
      event_id: null,
      metadata: { client_id: row.client_id },
      occurred_at: row.received_at ?? row.created_at,
      client_id: row.client_id,
      client_name: row.clients?.full_name ?? 'Unknown',
    })
  }

  for (const row of (commRes.data ?? []) as any[]) {
    entries.push({
      id: `comm:${row.id}`,
      type: 'communication_sent',
      title: `${row.channel} ${row.direction === 'inbound' ? 'received' : 'sent'}`,
      description: row.subject ? row.subject.slice(0, 120) : null,
      event_id: null,
      metadata: { client_id: row.client_id },
      occurred_at: row.created_at,
      client_id: row.client_id,
      client_name: row.clients?.full_name ?? 'Unknown',
    })
  }

  entries.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

  return entries.slice(0, limit)
}

// ---------------------------------------------------------------------------
// 4. addTimelineNote
// ---------------------------------------------------------------------------

export async function addTimelineNote(clientId: string, note: string, eventId?: string) {
  if (!note || note.trim().length === 0) {
    throw new Error('Note text is required')
  }

  const result = await addClientNote({
    client_id: clientId,
    note_text: note.trim(),
    category: 'general',
    event_id: eventId ?? null,
    pinned: false,
  })

  return result
}

// ---------------------------------------------------------------------------
// 5. getRelationshipMilestones
// ---------------------------------------------------------------------------

export async function getRelationshipMilestones(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const [eventsRes, ledgerRes, reviewsRes, inquiriesRes] = await Promise.all([
    db
      .from('events')
      .select('id, event_date, status, occasion, guest_count, quoted_price_cents')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('event_date', { ascending: true }),
    db
      .from('ledger_entries')
      .select('id, received_at, entry_type, amount_cents')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('received_at', { ascending: false }),
    db
      .from('client_reviews')
      .select('id, created_at, rating')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1),
    db
      .from('inquiries')
      .select('first_contact_at, created_at')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(1),
  ])

  const events = (eventsRes.data ?? []) as any[]
  const ledgerEntries = (ledgerRes.data ?? []) as any[]
  const reviews = (reviewsRes.data ?? []) as any[]

  // First event
  const completedEvents = events.filter((e: any) => e.status === 'completed')
  const firstEvent = completedEvents[0] ?? null

  // Biggest event by quoted price
  let biggestEvent: any = null
  let biggestPrice = 0
  for (const e of events) {
    if ((e.quoted_price_cents ?? 0) > biggestPrice) {
      biggestPrice = e.quoted_price_cents
      biggestEvent = e
    }
  }

  // Highest tip
  let highestTipCents = 0
  let highestTipDate: string | null = null
  for (const le of ledgerEntries) {
    if (le.entry_type === 'tip' && (le.amount_cents ?? 0) > highestTipCents) {
      highestTipCents = le.amount_cents
      highestTipDate = le.received_at
    }
  }

  // Most recent completed event
  const mostRecent = [...completedEvents].reverse()[0] ?? null

  // Lifetime value
  const lifetimeValueCents = ledgerEntries
    .filter((le: any) => (le.amount_cents ?? 0) > 0)
    .reduce((sum: number, le: any) => sum + (le.amount_cents ?? 0), 0)

  // First contact
  const firstInquiry = (inquiriesRes.data ?? [])[0] as any | undefined

  return {
    first_contact: firstInquiry?.first_contact_at ?? firstInquiry?.created_at ?? null,
    first_event: firstEvent
      ? {
          id: firstEvent.id,
          date: firstEvent.event_date,
          occasion: firstEvent.occasion,
        }
      : null,
    biggest_event: biggestEvent
      ? {
          id: biggestEvent.id,
          date: biggestEvent.event_date,
          occasion: biggestEvent.occasion,
          quoted_price_cents: biggestEvent.quoted_price_cents,
        }
      : null,
    highest_tip_cents: highestTipCents,
    highest_tip_date: highestTipDate,
    most_recent_event: mostRecent
      ? {
          id: mostRecent.id,
          date: mostRecent.event_date,
          occasion: mostRecent.occasion,
        }
      : null,
    total_completed_events: completedEvents.length,
    lifetime_value_cents: lifetimeValueCents,
    latest_review_rating: reviews[0]?.rating ?? null,
  }
}
