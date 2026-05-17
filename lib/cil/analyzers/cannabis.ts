// CIL Proactive Analyzer: Cannabis Operations
// Detects repeat cannabis clients, missing age confirmations on upcoming events,
// missing control packet closeouts, and cannabis revenue trends.

import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function analyzeCannabis(tenantId: string): Promise<ProactiveSignal[]> {
  try {
    const client = createServerClient()
    const signals: ProactiveSignal[] = []
    const now = Date.now()

    // 1. Repeat cannabis clients: 2+ cannabis events with the same tenant
    await analyzeRepeatCannabisClients(client, tenantId, signals, now)

    // 2. Missing age confirmations on upcoming cannabis events
    await analyzeMissingAgeConfirmations(client, tenantId, signals, now)

    // 3. Missing control packet closeout after completed cannabis events
    await analyzeMissingCloseouts(client, tenantId, signals, now)

    // 4. Cannabis revenue trend: this month vs prior month
    await analyzeCannabisRevenueTrend(client, tenantId, signals, now)

    return signals
  } catch (err) {
    console.error(
      '[CIL/cannabis] analyzer failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    return []
  }
}

// ── 1. Repeat Cannabis Clients ─────────────────────────────────────────────

async function analyzeRepeatCannabisClients(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const { data: cannabisEvents } = await client
    .from('events')
    .select('id, client_id, event_date, occasion')
    .eq('tenant_id', tenantId)
    .eq('cannabis_preference', true)
    .neq('status', 'cancelled')

  if (!cannabisEvents || cannabisEvents.length === 0) return

  // Group by client
  const byClient = new Map<string, typeof cannabisEvents>()
  for (const evt of cannabisEvents) {
    const list = byClient.get(evt.client_id) || []
    list.push(evt)
    byClient.set(evt.client_id, list)
  }

  // Flag clients with 2+ cannabis events
  const repeatClientIds: string[] = []
  const repeatClientCounts = new Map<string, number>()
  for (const [clientId, evts] of byClient) {
    if (evts.length >= 2) {
      repeatClientIds.push(clientId)
      repeatClientCounts.set(clientId, evts.length)
    }
  }

  if (repeatClientIds.length === 0) return

  const { data: clientNames } = await client
    .from('clients')
    .select('id, full_name')
    .in('id', repeatClientIds)

  const nameMap = new Map(
    (clientNames || []).map((c: { id: string; full_name: string }) => [c.id, c.full_name])
  )

  for (const clientId of repeatClientIds) {
    const count = repeatClientCounts.get(clientId) || 0
    const name = nameMap.get(clientId) || 'Client'

    signals.push({
      id: generateId(),
      domain: 'cannabis',
      urgency: 2,
      confidence: 0.85,
      title: `Repeat cannabis client: ${name}`,
      detail: `${name} has ${count} cannabis events. Consider VIP cannabis experience or personalized dosing profile.`,
      suggestedAction: 'Review their cannabis preferences and offer a tailored experience',
      actionType: 'navigate',
      actionPayload: { path: `/clients/${clientId}` },
      entityIds: [clientId],
      source: 'cannabis.repeatClient',
      createdAt: now,
    })
  }
}

// ── 2. Missing Age Confirmations on Upcoming Cannabis Events ───────────────

async function analyzeMissingAgeConfirmations(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysOut = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Get upcoming cannabis events within 30 days
  const { data: upcomingEvents } = await client
    .from('events')
    .select('id, event_date, occasion, client_id, guest_count')
    .eq('tenant_id', tenantId)
    .eq('cannabis_preference', true)
    .gte('event_date', today)
    .lte('event_date', thirtyDaysOut)
    .neq('status', 'cancelled')

  if (!upcomingEvents || upcomingEvents.length === 0) return

  for (const evt of upcomingEvents) {
    // Check guest profiles for this event
    const { data: profiles } = await client
      .from('guest_event_profile')
      .select('id, guest_token, age_confirmed')
      .eq('event_id', evt.id)
      .eq('tenant_id', tenantId)

    if (!profiles || profiles.length === 0) {
      // No profiles at all for a cannabis event: flag it
      signals.push({
        id: generateId(),
        domain: 'cannabis',
        urgency: 4,
        confidence: 0.8,
        title: `No guest profiles: ${evt.occasion || 'cannabis event'} on ${evt.event_date}`,
        detail: `Cannabis event has no guest RSVP profiles yet. Age confirmation cannot be verified without guest submissions.`,
        suggestedAction: 'Send guest feedback forms to collect age confirmations before the event',
        actionType: 'navigate',
        actionPayload: { path: `/events/${evt.id}` },
        entityIds: [evt.id],
        source: 'cannabis.missingAgeConfirmation',
        createdAt: now,
      })
      continue
    }

    const unconfirmed = profiles.filter((p: any) => !p.age_confirmed)

    if (unconfirmed.length > 0) {
      signals.push({
        id: generateId(),
        domain: 'cannabis',
        urgency: 4,
        confidence: 0.9,
        title: `Age unconfirmed: ${unconfirmed.length} guest(s) for ${evt.event_date}`,
        detail: `${unconfirmed.length} of ${profiles.length} guests have not confirmed age for "${evt.occasion || 'cannabis event'}" on ${evt.event_date}.`,
        suggestedAction: 'Follow up with guests to confirm age before the event',
        actionType: 'navigate',
        actionPayload: { path: `/events/${evt.id}` },
        entityIds: [evt.id],
        source: 'cannabis.missingAgeConfirmation',
        createdAt: now,
      })
    }
  }
}

// ── 3. Missing Control Packet Closeout ─────────────────────────────────────

async function analyzeMissingCloseouts(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Get completed cannabis events older than 7 days
  const { data: completedEvents } = await client
    .from('events')
    .select('id, event_date, occasion, client_id, service_completed_at')
    .eq('tenant_id', tenantId)
    .eq('cannabis_preference', true)
    .eq('status', 'completed')

  if (!completedEvents || completedEvents.length === 0) return

  // Filter to events completed more than 7 days ago
  const staleEvents = completedEvents.filter((evt: any) => {
    const completedDate = evt.service_completed_at || evt.event_date
    return new Date(completedDate).getTime() < now - 7 * 24 * 60 * 60 * 1000
  })

  if (staleEvents.length === 0) return

  const staleEventIds = staleEvents.map((e: any) => e.id)

  // Check which ones have finalized control packet snapshots
  const { data: snapshots } = await client
    .from('cannabis_control_packet_snapshots')
    .select('event_id, finalization_locked')
    .in('event_id', staleEventIds)
    .eq('finalization_locked', true)

  const finalizedEventIds = new Set((snapshots || []).map((s: any) => s.event_id))

  for (const evt of staleEvents) {
    if (finalizedEventIds.has(evt.id)) continue

    const daysSince = Math.round(
      (now - new Date(evt.service_completed_at || evt.event_date).getTime()) / (24 * 60 * 60 * 1000)
    )

    signals.push({
      id: generateId(),
      domain: 'cannabis',
      urgency: 3,
      confidence: 0.85,
      title: `Missing closeout: ${evt.occasion || 'cannabis event'} on ${evt.event_date}`,
      detail: `Cannabis event completed ${daysSince} days ago but the control packet has not been finalized. Compliance records should be locked.`,
      suggestedAction: 'Finalize the cannabis control packet for this event',
      actionType: 'navigate',
      actionPayload: { path: `/events/${evt.id}` },
      entityIds: [evt.id],
      source: 'cannabis.missingCloseout',
      createdAt: now,
    })
  }
}

// ── 4. Cannabis Revenue Trend ──────────────────────────────────────────────

async function analyzeCannabisRevenueTrend(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const currentMonthStart = new Date(now)
  currentMonthStart.setDate(1)
  currentMonthStart.setHours(0, 0, 0, 0)

  const priorMonthStart = new Date(currentMonthStart)
  priorMonthStart.setMonth(priorMonthStart.getMonth() - 1)

  const currentStr = currentMonthStart.toISOString().slice(0, 10)
  const priorStr = priorMonthStart.toISOString().slice(0, 10)
  const todayStr = new Date(now).toISOString().slice(0, 10)

  // Get cannabis events in current and prior month
  const { data: recentEvents } = await client
    .from('events')
    .select('id, event_date, quoted_price_cents, status')
    .eq('tenant_id', tenantId)
    .eq('cannabis_preference', true)
    .gte('event_date', priorStr)
    .lte('event_date', todayStr)
    .neq('status', 'cancelled')
    .not('quoted_price_cents', 'is', null)

  if (!recentEvents || recentEvents.length === 0) return

  let currentRevenue = 0
  let priorRevenue = 0

  for (const evt of recentEvents) {
    const cents = evt.quoted_price_cents as number
    if (evt.event_date >= currentStr) {
      currentRevenue += cents
    } else {
      priorRevenue += cents
    }
  }

  // Only signal if we have prior month data to compare
  if (priorRevenue <= 0) return

  const changePercent = Math.round(((currentRevenue - priorRevenue) / priorRevenue) * 100)

  if (Math.abs(changePercent) < 15) return // Only flag significant changes

  const direction = changePercent > 0 ? 'up' : 'down'
  const urgency: 1 | 2 | 3 | 4 | 5 = changePercent < -30 ? 4 : changePercent < 0 ? 3 : 2

  signals.push({
    id: generateId(),
    domain: 'cannabis',
    urgency,
    confidence: 0.75,
    title: `Cannabis revenue ${direction} ${Math.abs(changePercent)}%`,
    detail: `Cannabis revenue is ${direction} ${Math.abs(changePercent)}% vs last month ($${(currentRevenue / 100).toFixed(0)} vs $${(priorRevenue / 100).toFixed(0)}).`,
    suggestedAction:
      changePercent > 0
        ? 'Cannabis segment is growing. Consider expanding cannabis menu offerings.'
        : 'Cannabis revenue declining. Review pricing or reach out to cannabis-interested clients.',
    actionType: 'navigate',
    actionPayload: {
      path: '/analytics',
      currentMonthCents: currentRevenue,
      priorMonthCents: priorRevenue,
      changePercent,
    },
    entityIds: [],
    source: 'cannabis.revenueTrend',
    createdAt: now,
  })
}
