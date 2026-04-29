'use server'

// Client Communication Hub - Server Actions
// Unified timeline aggregating all client interactions, plus note management.
// Wraps existing data sources into the Communication Hub API shape.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ────────────────────────────────────────────────────────────────────

export type TimelineItemType =
  | 'event'
  | 'inquiry'
  | 'email'
  | 'note'
  | 'quote'
  | 'payment'
  | 'referral'

export interface TimelineItem {
  id: string
  type: TimelineItemType
  date: string
  title: string
  description: string | null
  status: string | null
  metadata: Record<string, any>
  linkUrl: string | null
}

export interface TimelineResult {
  items: TimelineItem[]
  totalCount: number
}

export interface TimelineOptions {
  types?: TimelineItemType[]
  dateFrom?: string
  dateTo?: string
  limit?: number
}

export interface CommunicationStats {
  totalInteractions: number
  lastContactDate: string | null
  mostCommonType: TimelineItemType | null
  interactionsPerMonth: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function snippet(text: string | null | undefined, maxLen = 120): string {
  if (!text) return ''
  const trimmed = text.trim()
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) + '...' : trimmed
}

// ── Main Timeline Action ─────────────────────────────────────────────────────

export async function getClientTimeline(
  clientId: string,
  options?: TimelineOptions
): Promise<TimelineResult> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const limit = options?.limit ?? 100

  const wantedTypes = options?.types ?? [
    'event',
    'inquiry',
    'email',
    'note',
    'quote',
    'payment',
    'referral',
  ]

  // Parallel fetch from all requested sources
  const fetches: Promise<TimelineItem[]>[] = []

  if (wantedTypes.includes('event')) {
    fetches.push(fetchEvents(db, tenantId, clientId))
  }
  if (wantedTypes.includes('inquiry')) {
    fetches.push(fetchInquiries(db, tenantId, clientId))
  }
  if (wantedTypes.includes('email')) {
    fetches.push(fetchEmails(db, tenantId, clientId))
  }
  if (wantedTypes.includes('note')) {
    fetches.push(fetchNotes(db, tenantId, clientId))
  }
  if (wantedTypes.includes('quote')) {
    fetches.push(fetchQuotes(db, tenantId, clientId))
  }
  if (wantedTypes.includes('payment')) {
    fetches.push(fetchPayments(db, tenantId, clientId))
  }
  if (wantedTypes.includes('referral')) {
    fetches.push(fetchReferrals(db, tenantId, clientId))
  }

  const results = await Promise.all(fetches)
  let items = results.flat()

  // Apply date range filter
  if (options?.dateFrom) {
    const from = new Date(options.dateFrom).getTime()
    items = items.filter((i) => new Date(i.date).getTime() >= from)
  }
  if (options?.dateTo) {
    const to = new Date(options.dateTo).getTime()
    items = items.filter((i) => new Date(i.date).getTime() <= to)
  }

  // Sort newest first
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalCount = items.length

  return {
    items: items.slice(0, limit),
    totalCount,
  }
}

// ── Communication Stats ──────────────────────────────────────────────────────

export async function getClientCommunicationStats(clientId: string): Promise<CommunicationStats> {
  const { items, totalCount } = await getClientTimeline(clientId, { limit: 500 })

  if (totalCount === 0) {
    return {
      totalInteractions: 0,
      lastContactDate: null,
      mostCommonType: null,
      interactionsPerMonth: 0,
    }
  }

  // Last contact date (newest item)
  const lastContactDate = items[0]?.date ?? null

  // Most common type
  const typeCounts = new Map<TimelineItemType, number>()
  for (const item of items) {
    typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1)
  }
  let mostCommonType: TimelineItemType | null = null
  let maxCount = 0
  for (const [type, count] of typeCounts) {
    if (count > maxCount) {
      maxCount = count
      mostCommonType = type
    }
  }

  // Interactions per month
  const oldest = items[items.length - 1]
  const newest = items[0]
  const monthSpan =
    oldest && newest
      ? Math.max(
          1,
          (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) /
            (30 * 24 * 60 * 60 * 1000)
        )
      : 1
  const interactionsPerMonth = Math.round((totalCount / monthSpan) * 10) / 10

  return {
    totalInteractions: totalCount,
    lastContactDate,
    mostCommonType,
    interactionsPerMonth,
  }
}

// ── Note Actions (delegates to existing lib/notes/actions.ts) ────────────────

export async function addCommunicationNote(clientId: string, content: string, pinned = false) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_notes')
    .insert({
      tenant_id: user.tenantId!,
      client_id: clientId,
      note_text: content,
      category: 'general',
      pinned,
      source: 'manual',
    })
    .select()
    .single()

  if (error) {
    console.error('[addCommunicationNote] Error:', error)
    throw new Error('Failed to add note')
  }

  revalidatePath(`/clients/${clientId}`)

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const preview = content.length > 60 ? content.slice(0, 60) + '...' : content
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'client_note_added',
      domain: 'communication',
      entityType: 'client_note',
      entityId: data.id,
      summary: `Added note: "${preview}"`,
      context: { pinned },
      clientId,
    })
  } catch (err) {
    console.error('[addCommunicationNote] Activity log failed (non-blocking):', err)
  }

  return {
    id: data.id,
    type: 'note' as const,
    date: data.created_at,
    title: 'Note added',
    description: content,
    status: null,
    metadata: { pinned: data.pinned, category: data.category },
    linkUrl: null,
  }
}

export async function getCommunicationNotes(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_notes')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getCommunicationNotes] Error:', error)
    return []
  }

  return (data ?? []).map((n: any) => ({
    id: n.id,
    type: 'note' as const,
    date: n.created_at,
    title: n.pinned ? 'Pinned note' : 'Note',
    description: n.note_text,
    status: null,
    metadata: { pinned: n.pinned, category: n.category, source: n.source },
    linkUrl: null,
  }))
}

// ── Data Source Fetchers ─────────────────────────────────────────────────────

async function fetchEvents(db: any, tenantId: string, clientId: string): Promise<TimelineItem[]> {
  const { data } = await db
    .from('events')
    .select('id, created_at, event_date, status, occasion, guest_count, quoted_price_cents')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []).map((e: any) => {
    const statusLabels: Record<string, string> = {
      draft: 'Event created (draft)',
      proposed: 'Event proposed to client',
      accepted: 'Client accepted event',
      paid: 'Event deposit paid',
      confirmed: 'Event confirmed',
      in_progress: 'Event in progress',
      completed: 'Event completed',
      cancelled: 'Event cancelled',
    }
    return {
      id: `event-${e.id}`,
      type: 'event' as const,
      date: e.event_date ?? e.created_at,
      title: statusLabels[e.status] ?? `Event (${e.status})`,
      description:
        [e.occasion, e.guest_count ? `${e.guest_count} guests` : null]
          .filter(Boolean)
          .join(' - ') || null,
      status: e.status,
      metadata: {
        eventId: e.id,
        occasion: e.occasion,
        guestCount: e.guest_count,
        quotedPriceCents: e.quoted_price_cents,
      },
      linkUrl: `/events/${e.id}`,
    }
  })
}

async function fetchInquiries(
  db: any,
  tenantId: string,
  clientId: string
): Promise<TimelineItem[]> {
  const { data } = await db
    .from('inquiries')
    .select('id, created_at, first_contact_at, status, channel')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(30)

  return (data ?? []).map((inq: any) => {
    const statusLabels: Record<string, string> = {
      new: 'New inquiry received',
      awaiting_client: 'Awaiting client reply',
      awaiting_chef: 'Awaiting chef reply',
      quoted: 'Quote sent',
      confirmed: 'Inquiry confirmed',
      declined: 'Inquiry declined',
      expired: 'Inquiry expired',
    }
    return {
      id: `inquiry-${inq.id}`,
      type: 'inquiry' as const,
      date: inq.first_contact_at ?? inq.created_at,
      title: statusLabels[inq.status] ?? `Inquiry (${inq.status})`,
      description: inq.channel ? `via ${inq.channel}` : null,
      status: inq.status,
      metadata: { inquiryId: inq.id, channel: inq.channel },
      linkUrl: `/inquiries/${inq.id}`,
    }
  })
}

async function fetchEmails(db: any, tenantId: string, clientId: string): Promise<TimelineItem[]> {
  const { data } = await db
    .from('messages')
    .select('id, created_at, sent_at, channel, direction, body, subject')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []).map((msg: any) => {
    const dirLabel = msg.direction === 'inbound' ? 'Client messaged' : 'You messaged client'
    return {
      id: `email-${msg.id}`,
      type: 'email' as const,
      date: msg.sent_at ?? msg.created_at,
      title: dirLabel + (msg.channel ? ` (${msg.channel})` : ''),
      description: snippet(msg.subject || msg.body),
      status: msg.direction,
      metadata: {
        messageId: msg.id,
        channel: msg.channel,
        direction: msg.direction,
        subject: msg.subject,
      },
      linkUrl: null,
    }
  })
}

async function fetchNotes(db: any, tenantId: string, clientId: string): Promise<TimelineItem[]> {
  const { data } = await db
    .from('client_notes')
    .select('id, created_at, note_text, category, pinned, source')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []).map((n: any) => ({
    id: `note-${n.id}`,
    type: 'note' as const,
    date: n.created_at,
    title: n.pinned ? 'Pinned note' : 'Note',
    description: snippet(n.note_text),
    status: null,
    metadata: {
      noteId: n.id,
      pinned: n.pinned,
      category: n.category,
      source: n.source,
    },
    linkUrl: null,
  }))
}

async function fetchQuotes(db: any, tenantId: string, clientId: string): Promise<TimelineItem[]> {
  // Quotes are linked through events
  const { data } = await db
    .from('quotes')
    .select('id, created_at, status, total_cents, version, event_id, events!inner(client_id)')
    .eq('tenant_id', tenantId)
    .eq('events.client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(30)

  return (data ?? []).map((q: any) => {
    const statusLabels: Record<string, string> = {
      draft: 'Quote drafted',
      sent: 'Quote sent to client',
      accepted: 'Quote accepted',
      declined: 'Quote declined',
      expired: 'Quote expired',
      revised: 'Quote revised',
    }
    return {
      id: `quote-${q.id}`,
      type: 'quote' as const,
      date: q.created_at,
      title: statusLabels[q.status] ?? `Quote (${q.status})`,
      description: q.total_cents ? formatCents(q.total_cents) : null,
      status: q.status,
      metadata: {
        quoteId: q.id,
        totalCents: q.total_cents,
        version: q.version,
        eventId: q.event_id,
      },
      linkUrl: q.event_id ? `/events/${q.event_id}` : null,
    }
  })
}

async function fetchPayments(db: any, tenantId: string, clientId: string): Promise<TimelineItem[]> {
  const { data } = await db
    .from('ledger_entries')
    .select('id, created_at, received_at, entry_type, amount_cents, payment_method, description')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []).map((le: any) => {
    const typeLabels: Record<string, string> = {
      payment: 'Payment received',
      deposit: 'Deposit received',
      installment: 'Installment received',
      final_payment: 'Final payment received',
      tip: 'Tip received',
      refund: 'Refund issued',
      adjustment: 'Balance adjustment',
      add_on: 'Add-on charge',
      credit: 'Credit applied',
    }
    return {
      id: `payment-${le.id}`,
      type: 'payment' as const,
      date: le.received_at ?? le.created_at,
      title: typeLabels[le.entry_type] ?? `Payment (${le.entry_type})`,
      description: [
        formatCents(Math.abs(le.amount_cents)),
        le.payment_method,
        snippet(le.description, 40),
      ]
        .filter(Boolean)
        .join(' - '),
      status: le.entry_type,
      metadata: {
        ledgerEntryId: le.id,
        amountCents: le.amount_cents,
        paymentMethod: le.payment_method,
        entryType: le.entry_type,
      },
      linkUrl: null,
    }
  })
}

async function fetchReferrals(
  db: any,
  tenantId: string,
  clientId: string
): Promise<TimelineItem[]> {
  // Referrals where this client is either the referrer or the referred
  const { data: asReferrer } = await db
    .from('client_referrals' as any)
    .select(
      'id, created_at, status, referral_code, revenue_generated_cents, referred:clients!referred_client_id(full_name)'
    )
    .eq('tenant_id', tenantId)
    .eq('referrer_client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: asReferred } = await db
    .from('client_referrals' as any)
    .select(
      'id, created_at, status, referral_code, revenue_generated_cents, referrer:clients!referrer_client_id(full_name)'
    )
    .eq('tenant_id', tenantId)
    .eq('referred_client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20)

  const items: TimelineItem[] = []

  for (const r of (asReferrer ?? []) as any[]) {
    const referredName = r.referred?.full_name ?? 'someone'
    items.push({
      id: `referral-out-${r.id}`,
      type: 'referral',
      date: r.created_at,
      title: `Referred ${referredName}`,
      description: r.revenue_generated_cents
        ? `Generated ${formatCents(r.revenue_generated_cents)}`
        : null,
      status: r.status,
      metadata: {
        referralId: r.id,
        direction: 'outgoing',
        code: r.referral_code,
        revenueCents: r.revenue_generated_cents,
      },
      linkUrl: null,
    })
  }

  for (const r of (asReferred ?? []) as any[]) {
    const referrerName = r.referrer?.full_name ?? 'someone'
    items.push({
      id: `referral-in-${r.id}`,
      type: 'referral',
      date: r.created_at,
      title: `Referred by ${referrerName}`,
      description: null,
      status: r.status,
      metadata: {
        referralId: r.id,
        direction: 'incoming',
        code: r.referral_code,
      },
      linkUrl: null,
    })
  }

  return items
}
