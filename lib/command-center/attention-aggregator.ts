// Attention Aggregator - pulls all "needs attention" items from multiple sources
// Returns a sorted list by urgency then recency

import { createServerClient } from '@/lib/db/server'

// ---- Types ----

export type AttentionUrgency = 'critical' | 'high' | 'medium' | 'low'

export type AttentionItemType =
  | 'event_today'
  | 'event_this_week'
  | 'unanswered_inquiry'
  | 'unsigned_contract'
  | 'unpaid_invoice'
  | 'overdue_task'
  | 'expiring_quote'
  | 'client_follow_up'
  | 'unread_message'

export type AttentionItem = {
  id: string
  type: AttentionItemType
  title: string
  urgency: AttentionUrgency
  action: string // href
  source: string
  createdAt: string
  meta?: Record<string, unknown>
}

const URGENCY_ORDER: Record<AttentionUrgency, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function sortItems(items: AttentionItem[]): AttentionItem[] {
  return items.sort((a, b) => {
    const urgDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
    if (urgDiff !== 0) return urgDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

// ---- Source fetchers ----

async function fetchTodayEvents(db: any, tenantId: string): Promise<AttentionItem[]> {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const { data } = await db
    .from('events')
    .select('id, occasion, event_date, start_time, client:clients(full_name), guest_count')
    .eq('tenant_id', tenantId)
    .eq('event_date', today)
    .not('status', 'in', '(cancelled,completed)')
    .order('start_time', { ascending: true })
    .limit(20)

  if (!data?.length) return []
  return data.map((e: any) => ({
    id: `event-today-${e.id}`,
    type: 'event_today' as const,
    title: `${e.occasion || 'Event'} for ${e.client?.full_name || 'client'}${e.guest_count ? ` (${e.guest_count} guests)` : ''}`,
    urgency: 'critical' as const,
    action: `/events/${e.id}`,
    source: 'Events',
    createdAt: `${e.event_date}T${e.start_time || '00:00:00'}`,
    meta: { guestCount: e.guest_count, startTime: e.start_time },
  }))
}

async function fetchThisWeekEvents(db: any, tenantId: string): Promise<AttentionItem[]> {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 86400000)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  const weekEnd = new Date(now.getTime() + 7 * 86400000)
  const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`

  const { data } = await db
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name), guest_count')
    .eq('tenant_id', tenantId)
    .gte('event_date', tomorrowStr)
    .lte('event_date', weekEndStr)
    .not('status', 'in', '(cancelled,completed)')
    .order('event_date', { ascending: true })
    .limit(20)

  if (!data?.length) return []
  return data.map((e: any) => ({
    id: `event-week-${e.id}`,
    type: 'event_this_week' as const,
    title: `${e.occasion || 'Event'} for ${e.client?.full_name || 'client'} on ${e.event_date}`,
    urgency: 'medium' as const,
    action: `/events/${e.id}`,
    source: 'Events',
    createdAt: e.event_date,
    meta: { guestCount: e.guest_count },
  }))
}

async function fetchUnansweredInquiries(db: any, tenantId: string): Promise<AttentionItem[]> {
  const { data } = await db
    .from('inquiries')
    .select('id, status, channel, created_at, clients(full_name)')
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_chef'])
    .order('created_at', { ascending: false })
    .limit(20)

  if (!data?.length) return []
  return data.map((i: any) => {
    const daysSince = Math.floor(
      (Date.now() - new Date(i.created_at).getTime()) / 86400000
    )
    const urgency: AttentionUrgency = daysSince >= 3 ? 'high' : daysSince >= 1 ? 'medium' : 'low'
    return {
      id: `inquiry-${i.id}`,
      type: 'unanswered_inquiry' as const,
      title: `Inquiry from ${i.clients?.full_name || 'Unknown'}${i.channel ? ` via ${i.channel}` : ''}`,
      urgency,
      action: `/inquiries/${i.id}`,
      source: 'Inquiries',
      createdAt: i.created_at,
    }
  })
}

async function fetchUnsignedContracts(db: any, tenantId: string): Promise<AttentionItem[]> {
  const { data } = await db
    .from('event_contracts')
    .select('id, status, sent_at, created_at, event_id, events(occasion, event_date), clients(full_name)')
    .eq('chef_id', tenantId)
    .in('status', ['sent', 'viewed'])
    .order('created_at', { ascending: false })
    .limit(20)

  if (!data?.length) return []
  return data.map((c: any) => {
    const daysSinceSent = c.sent_at
      ? Math.floor((Date.now() - new Date(c.sent_at).getTime()) / 86400000)
      : 0
    const urgency: AttentionUrgency = daysSinceSent >= 5 ? 'high' : 'medium'
    return {
      id: `contract-${c.id}`,
      type: 'unsigned_contract' as const,
      title: `Contract for ${c.clients?.full_name || 'client'} (${c.events?.occasion || 'event'}) awaiting signature`,
      urgency,
      action: `/events/${c.event_id || c.id}`,
      source: 'Contracts',
      createdAt: c.created_at,
    }
  })
}

async function fetchUnpaidInvoices(db: any, tenantId: string): Promise<AttentionItem[]> {
  const { data } = await db
    .from('event_financial_summary')
    .select('event_id, outstanding_balance_cents')
    .eq('tenant_id', tenantId)
    .gt('outstanding_balance_cents', 0)
    .order('outstanding_balance_cents', { ascending: false })
    .limit(15)

  if (!data?.length) return []

  // Fetch event details for the ones with outstanding balances
  const eventIds = data.map((d: any) => d.event_id).filter(Boolean)
  if (eventIds.length === 0) return []

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .in('id', eventIds)

  const eventMap = new Map<string, any>((events || []).map((e: any) => [e.id, e]))

  return data.map((inv: any) => {
    const evt: any = eventMap.get(inv.event_id)
    const dollars = ((inv.outstanding_balance_cents || 0) / 100).toFixed(0)
    return {
      id: `invoice-${inv.event_id}`,
      type: 'unpaid_invoice' as const,
      title: `$${dollars} outstanding for ${evt?.client?.full_name || 'client'} (${evt?.occasion || 'event'})`,
      urgency: (inv.outstanding_balance_cents >= 50000 ? 'high' : 'medium') as AttentionUrgency,
      action: `/events/${inv.event_id}/financial`,
      source: 'Finance',
      createdAt: evt?.event_date || new Date().toISOString(),
    }
  })
}

async function fetchExpiringQuotes(db: any, tenantId: string): Promise<AttentionItem[]> {
  const now = new Date()
  const threeDaysOut = new Date(now.getTime() + 3 * 86400000).toISOString()

  const { data } = await db
    .from('quotes')
    .select('id, total_cents, expires_at, created_at, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'sent'])
    .lte('expires_at', threeDaysOut)
    .gte('expires_at', now.toISOString())
    .order('expires_at', { ascending: true })
    .limit(10)

  if (!data?.length) return []
  return data.map((q: any) => ({
    id: `quote-${q.id}`,
    type: 'expiring_quote' as const,
    title: `Quote for ${q.client?.full_name || 'client'} expiring soon`,
    urgency: 'high' as const,
    action: `/quotes/${q.id}`,
    source: 'Quotes',
    createdAt: q.created_at,
  }))
}

async function fetchClientFollowUps(db: any, tenantId: string): Promise<AttentionItem[]> {
  const now = new Date().toISOString()

  const { data } = await db
    .from('client_follow_ups')
    .select('id, due_date, note, client_id, clients(full_name)')
    .eq('tenant_id', tenantId)
    .eq('completed', false)
    .lte('due_date', now)
    .order('due_date', { ascending: true })
    .limit(15)

  if (!data?.length) return []
  return data.map((f: any) => ({
    id: `followup-${f.id}`,
    type: 'client_follow_up' as const,
    title: `Follow up with ${f.clients?.full_name || 'client'}${f.note ? `: ${f.note.slice(0, 60)}` : ''}`,
    urgency: 'medium' as const,
    action: `/clients/${f.client_id}`,
    source: 'Clients',
    createdAt: f.due_date,
  }))
}

async function fetchUnreadMessages(db: any, tenantId: string): Promise<AttentionItem[]> {
  const { data } = await db
    .from('conversations')
    .select('id, subject, unread_count, updated_at, client_id, clients(full_name)')
    .eq('tenant_id', tenantId)
    .gt('unread_count', 0)
    .order('updated_at', { ascending: false })
    .limit(10)

  if (!data?.length) return []
  return data.map((m: any) => ({
    id: `message-${m.id}`,
    type: 'unread_message' as const,
    title: `${m.unread_count} unread from ${m.clients?.full_name || 'client'}${m.subject ? ` re: ${m.subject}` : ''}`,
    urgency: 'low' as const,
    action: `/inbox/${m.id}`,
    source: 'Inbox',
    createdAt: m.updated_at,
  }))
}

// ---- Main aggregator ----

export async function getAttentionItems(tenantId: string): Promise<AttentionItem[]> {
  const db: any = createServerClient()

  // Fetch all sources in parallel, each with its own error boundary
  const results = await Promise.allSettled([
    fetchTodayEvents(db, tenantId),
    fetchThisWeekEvents(db, tenantId),
    fetchUnansweredInquiries(db, tenantId),
    fetchUnsignedContracts(db, tenantId),
    fetchUnpaidInvoices(db, tenantId),
    fetchExpiringQuotes(db, tenantId),
    fetchClientFollowUps(db, tenantId),
    fetchUnreadMessages(db, tenantId),
  ])

  const allItems: AttentionItem[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value)
    }
    // Failed sources silently skipped; partial data is better than no data
  }

  return sortItems(allItems)
}
