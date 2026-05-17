'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  TipRecord,
  TipMethod,
  TipSummary,
  ClientTipHistory,
  TipTrend,
  LapsedHighTipper,
  TopTipper,
} from './tip-tracking-types'

// ── Record a Tip ────────────────────────────────────────────────────────────

export async function recordTip(
  eventId: string,
  amountCents: number,
  method: TipMethod,
  notes?: string
): Promise<{ success: boolean; tip?: TipRecord; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  if (!eventId || typeof eventId !== 'string') {
    return { success: false, error: 'Event ID is required' }
  }
  if (!amountCents || amountCents <= 0) {
    return { success: false, error: 'Tip amount must be greater than zero' }
  }
  if (!Number.isInteger(amountCents)) {
    return { success: false, error: 'Tip amount must be a whole number (cents)' }
  }

  // Verify event belongs to tenant
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (eventErr || !event) {
    return { success: false, error: 'Event not found' }
  }

  const { data, error } = await db
    .from('event_tips')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      amount_cents: amountCents,
      method: method || 'cash',
      notes: notes || null,
      received_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[tip-tracking] recordTip error', error)
    return { success: false, error: 'Failed to record tip' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true, tip: mapRow(data) }
}

// ── Get Tips for an Event ───────────────────────────────────────────────────

export async function getTipHistory(
  eventId: string
): Promise<{ success: boolean; tips?: TipRecord[]; summary?: TipSummary; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: tips, error } = await db
    .from('event_tips')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('received_at', { ascending: false })

  if (error) {
    console.error('[tip-tracking] getTipHistory error', error)
    return { success: false, error: 'Failed to fetch tip history' }
  }

  const mapped = (tips || []).map(mapRow)

  // Build summary
  const { data: event } = await db
    .from('events')
    .select('quoted_price_cents')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const totalCents = mapped.reduce((sum: number, t: TipRecord) => sum + t.amountCents, 0)
  const methods: Record<string, number> = {}
  for (const t of mapped) {
    methods[t.method] = (methods[t.method] || 0) + 1
  }

  const invoiceCents = event?.quoted_price_cents || 0
  const summary: TipSummary = {
    totalTipsCents: totalCents,
    tipCount: mapped.length,
    averageTipCents: mapped.length > 0 ? Math.round(totalCents / mapped.length) : 0,
    tipPercentageOfInvoice: invoiceCents > 0 ? Math.round((totalCents / invoiceCents) * 100) : null,
    methods: methods as any,
  }

  return { success: true, tips: mapped, summary }
}

// ── Client Tip Summary (Lifetime) ──────────────────────────────────────────

export async function getClientTipSummary(
  clientId: string
): Promise<{ success: boolean; history?: ClientTipHistory; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get all events for this client
  const { data: events, error: eventsErr } = await db
    .from('events')
    .select('id, quoted_price_cents')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)

  if (eventsErr) {
    console.error('[tip-tracking] getClientTipSummary events error', eventsErr)
    return { success: false, error: 'Failed to fetch client events' }
  }

  if (!events || events.length === 0) {
    return { success: false, error: 'No events found for this client' }
  }

  const eventIds = events.map((e: any) => e.id)

  // Get all tips across those events
  const { data: tips, error: tipsErr } = await db
    .from('event_tips')
    .select('*')
    .in('event_id', eventIds)
    .eq('tenant_id', tenantId)
    .order('received_at', { ascending: true })

  if (tipsErr) {
    console.error('[tip-tracking] getClientTipSummary tips error', tipsErr)
    return { success: false, error: 'Failed to fetch tips' }
  }

  const mapped = (tips || []).map(mapRow)
  const totalTipsCents = mapped.reduce((sum: number, t: TipRecord) => sum + t.amountCents, 0)

  // Calculate which events had tips
  const eventsWithTipSet = new Set(mapped.map((t: TipRecord) => t.eventId))
  const totalInvoiceCents = events.reduce(
    (sum: number, e: any) => sum + (e.quoted_price_cents || 0),
    0
  )

  // Get client name
  const { data: client } = await db
    .from('clients')
    .select('full_name')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const history: ClientTipHistory = {
    clientId,
    clientName: client?.full_name || 'Unknown',
    totalTipsCents,
    tipCount: mapped.length,
    averageTipCents: mapped.length > 0 ? Math.round(totalTipsCents / mapped.length) : 0,
    averageTipPercentage:
      totalInvoiceCents > 0 ? Math.round((totalTipsCents / totalInvoiceCents) * 100) : null,
    firstTipDate: mapped.length > 0 ? mapped[0].receivedAt : null,
    lastTipDate: mapped.length > 0 ? mapped[mapped.length - 1].receivedAt : null,
    tipsEveryTime: events.length > 0 && eventsWithTipSet.size === events.length,
    totalEvents: events.length,
    eventsWithTips: eventsWithTipSet.size,
  }

  return { success: true, history }
}

// ── Tip Trends (Monthly) ───────────────────────────────────────────────────

export async function getTipTrends(
  months: number = 12
): Promise<{ success: boolean; trends?: TipTrend[]; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)

  const { data: tips, error } = await db
    .from('event_tips')
    .select('amount_cents, received_at, event_id')
    .eq('tenant_id', tenantId)
    .gte('received_at', cutoff.toISOString())
    .order('received_at', { ascending: true })

  if (error) {
    console.error('[tip-tracking] getTipTrends error', error)
    return { success: false, error: 'Failed to fetch tip trends' }
  }

  // Group by month
  const monthMap = new Map<
    string,
    { totalCents: number; tipCount: number; eventSet: Set<string> }
  >()

  for (const tip of tips || []) {
    const date = new Date(tip.received_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!monthMap.has(key)) {
      monthMap.set(key, { totalCents: 0, tipCount: 0, eventSet: new Set() })
    }
    const entry = monthMap.get(key)!
    entry.totalCents += tip.amount_cents
    entry.tipCount += 1
    entry.eventSet.add(tip.event_id)
  }

  const trends: TipTrend[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      totalCents: data.totalCents,
      tipCount: data.tipCount,
      eventCount: data.eventSet.size,
      averageCents: data.tipCount > 0 ? Math.round(data.totalCents / data.tipCount) : 0,
    }))

  return { success: true, trends }
}

// ── Lapsed High Tippers ────────────────────────────────────────────────────

export async function getLapsedHighTippers(
  daysSinceLastEvent: number = 300
): Promise<{ success: boolean; lapsed?: LapsedHighTipper[]; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get all tips with their event dates
  const { data: tips, error: tipsErr } = await db
    .from('event_tips')
    .select('amount_cents, event_id')
    .eq('tenant_id', tenantId)

  if (tipsErr) {
    console.error('[tip-tracking] getLapsedHighTippers tips error', tipsErr)
    return { success: false, error: 'Failed to fetch tips' }
  }

  if (!tips || tips.length === 0) {
    return { success: true, lapsed: [] }
  }

  // Get event IDs that have tips
  const eventIds = [...new Set((tips as any[]).map((t: any) => t.event_id))]

  // Get events with client info and dates
  const { data: events, error: eventsErr } = await db
    .from('events')
    .select('id, client_id, event_date')
    .in('id', eventIds)
    .eq('tenant_id', tenantId)

  if (eventsErr) {
    console.error('[tip-tracking] getLapsedHighTippers events error', eventsErr)
    return { success: false, error: 'Failed to fetch events' }
  }

  // Build event lookup
  const eventLookup = new Map<string, { clientId: string; eventDate: string }>()
  for (const e of events || []) {
    eventLookup.set(e.id, { clientId: e.client_id, eventDate: e.event_date })
  }

  // Aggregate by client
  const clientMap = new Map<
    string,
    { totalCents: number; tipCount: number; lastEventDate: string }
  >()

  for (const tip of tips as any[]) {
    const ev = eventLookup.get(tip.event_id)
    if (!ev) continue
    const cid = ev.clientId

    if (!clientMap.has(cid)) {
      clientMap.set(cid, { totalCents: 0, tipCount: 0, lastEventDate: ev.eventDate })
    }
    const entry = clientMap.get(cid)!
    entry.totalCents += tip.amount_cents
    entry.tipCount += 1
    if (ev.eventDate > entry.lastEventDate) {
      entry.lastEventDate = ev.eventDate
    }
  }

  // Filter to lapsed (no event in N days) and get the latest event per client
  const now = new Date()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastEvent)

  // Get ALL latest event dates per client (not just tipped events)
  const clientIds = [...clientMap.keys()]
  const { data: allEvents } = await db
    .from('events')
    .select('client_id, event_date')
    .in('client_id', clientIds)
    .eq('tenant_id', tenantId)
    .order('event_date', { ascending: false })

  const latestEventByClient = new Map<string, string>()
  for (const e of allEvents || []) {
    if (!latestEventByClient.has(e.client_id)) {
      latestEventByClient.set(e.client_id, e.event_date)
    }
  }

  // Filter to lapsed clients
  const lapsedClientIds: string[] = []
  for (const [cid] of clientMap) {
    const lastDate = latestEventByClient.get(cid) || clientMap.get(cid)!.lastEventDate
    if (new Date(lastDate) < cutoffDate) {
      lapsedClientIds.push(cid)
    }
  }

  if (lapsedClientIds.length === 0) {
    return { success: true, lapsed: [] }
  }

  // Get client names
  const { data: clientRows } = await db
    .from('clients')
    .select('id, full_name')
    .in('id', lapsedClientIds)
    .eq('tenant_id', tenantId)

  const nameMap = new Map<string, string>()
  for (const c of clientRows || []) {
    nameMap.set(c.id, c.full_name)
  }

  const lapsed: LapsedHighTipper[] = lapsedClientIds
    .map((cid) => {
      const data = clientMap.get(cid)!
      const lastDate = latestEventByClient.get(cid) || data.lastEventDate
      const daysSince = Math.floor(
        (now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        clientId: cid,
        clientName: nameMap.get(cid) || 'Unknown',
        totalTipsCents: data.totalCents,
        tipCount: data.tipCount,
        averageTipCents: Math.round(data.totalCents / data.tipCount),
        lastEventDate: lastDate,
        daysSinceLastEvent: daysSince,
      }
    })
    .sort((a, b) => b.totalTipsCents - a.totalTipsCents)

  return { success: true, lapsed }
}

// ── Top Tippers ────────────────────────────────────────────────────────────

export async function getTopTippers(
  limit: number = 10
): Promise<{ success: boolean; topTippers?: TopTipper[]; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get all tips
  const { data: tips, error: tipsErr } = await db
    .from('event_tips')
    .select('amount_cents, event_id, received_at')
    .eq('tenant_id', tenantId)

  if (tipsErr) {
    console.error('[tip-tracking] getTopTippers error', tipsErr)
    return { success: false, error: 'Failed to fetch tips' }
  }

  if (!tips || tips.length === 0) {
    return { success: true, topTippers: [] }
  }

  // Get event -> client mapping
  const eventIds = [...new Set((tips as any[]).map((t: any) => t.event_id))]
  const { data: events } = await db
    .from('events')
    .select('id, client_id')
    .in('id', eventIds)
    .eq('tenant_id', tenantId)

  const eventClientMap = new Map<string, string>()
  for (const e of events || []) {
    eventClientMap.set(e.id, e.client_id)
  }

  // Aggregate by client
  const clientAgg = new Map<
    string,
    { totalCents: number; tipCount: number; lastTipDate: string | null }
  >()

  for (const tip of tips as any[]) {
    const clientId = eventClientMap.get(tip.event_id)
    if (!clientId) continue

    if (!clientAgg.has(clientId)) {
      clientAgg.set(clientId, { totalCents: 0, tipCount: 0, lastTipDate: null })
    }
    const entry = clientAgg.get(clientId)!
    entry.totalCents += tip.amount_cents
    entry.tipCount += 1
    if (!entry.lastTipDate || tip.received_at > entry.lastTipDate) {
      entry.lastTipDate = tip.received_at
    }
  }

  // Get client names
  const clientIds = [...clientAgg.keys()]
  const { data: clientRows } = await db
    .from('clients')
    .select('id, full_name')
    .in('id', clientIds)
    .eq('tenant_id', tenantId)

  const nameMap = new Map<string, string>()
  for (const c of clientRows || []) {
    nameMap.set(c.id, c.full_name)
  }

  const topTippers: TopTipper[] = [...clientAgg.entries()]
    .map(([clientId, data]) => ({
      clientId,
      clientName: nameMap.get(clientId) || 'Unknown',
      totalTipsCents: data.totalCents,
      tipCount: data.tipCount,
      averageTipCents: Math.round(data.totalCents / data.tipCount),
      lastTipDate: data.lastTipDate,
    }))
    .sort((a, b) => b.totalTipsCents - a.totalTipsCents)
    .slice(0, limit)

  return { success: true, topTippers }
}

// ── Delete a Tip ───────────────────────────────────────────────────────────

export async function deleteTip(
  tipId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db.from('event_tips').delete().eq('id', tipId).eq('tenant_id', tenantId)

  if (error) {
    console.error('[tip-tracking] deleteTip error', error)
    return { success: false, error: 'Failed to delete tip' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// ── Row Mapper ─────────────────────────────────────────────────────────────

function mapRow(row: any): TipRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    tenantId: row.tenant_id,
    amountCents: row.amount_cents,
    method: row.method,
    receivedAt: row.received_at,
    notes: row.notes,
    createdAt: row.created_at,
  }
}
