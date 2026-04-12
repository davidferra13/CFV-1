'use server'

// Booking Conversion Tracking
// Tracks inquiry-to-confirmed ratio, funnel dropoff points, and conversion by source.
// Pure SQL aggregation over existing events, inquiries, and event_state_transitions tables.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { dateToMonthString } from '@/lib/utils/format'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DateRange {
  from: string // ISO date string
  to: string // ISO date string
}

export interface FunnelStage {
  key: string
  label: string
  count: number
  conversionFromTop: number | null // % of total that reached this stage
  conversionFromPrev: number | null // % of previous stage that reached this stage
  dropoffFromPrev: number | null // % lost between previous stage and this one
}

export interface ConversionFunnelData {
  stages: FunnelStage[]
  totalCreated: number
  totalCompleted: number
  totalCancelled: number
  overallConversionRate: number | null // created -> completed %
  cancelledByStage: Array<{ stage: string; count: number }>
}

export interface SourceConversionRow {
  source: string
  totalEvents: number
  proposed: number
  accepted: number
  paid: number
  confirmed: number
  completed: number
  cancelled: number
  conversionRate: number | null // created -> completed %
}

export interface StageTimingRow {
  fromStage: string
  toStage: string
  avgDays: number
  medianDays: number | null
  minDays: number
  maxDays: number
  transitionCount: number
}

export interface MonthlyConversionRow {
  month: string // YYYY-MM
  created: number
  completed: number
  cancelled: number
  conversionRate: number | null
}

export interface SourceQualityRow {
  source: string
  totalEvents: number
  completedEvents: number
  totalRevenueCents: number
  avgRevenueCents: number
  conversionRate: number | null
}

export interface LostDealRow {
  eventId: string
  occasion: string | null
  source: string | null
  cancelledAt: string | null
  cancelledAtStage: string | null
  cancellationReason: string | null
  quotedPriceCents: number | null
}

export interface LostDealsAnalysis {
  totalLost: number
  totalLostRevenueCents: number
  lostByStage: Array<{ stage: string; count: number; revenueCents: number }>
  topReasons: Array<{ reason: string; count: number }>
  deals: LostDealRow[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_ORDER = [
  'draft',
  'proposed',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
  'completed',
] as const

const STAGE_LABELS: Record<string, string> = {
  draft: 'Created (Draft)',
  proposed: 'Quote Sent',
  accepted: 'Accepted',
  paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
}

const TRANSITION_PAIRS = [
  { from: 'draft', to: 'proposed', label: 'Draft to Proposed' },
  { from: 'proposed', to: 'accepted', label: 'Proposed to Accepted' },
  { from: 'accepted', to: 'paid', label: 'Accepted to Paid' },
  { from: 'paid', to: 'confirmed', label: 'Paid to Confirmed' },
  { from: 'confirmed', to: 'in_progress', label: 'Confirmed to In Progress' },
  { from: 'in_progress', to: 'completed', label: 'In Progress to Completed' },
]

function safePercent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 1000) / 10 // one decimal
}

// ── Server Actions ───────────────────────────────────────────────────────────

/**
 * Full conversion funnel: count at each stage + conversion/dropoff rates.
 * Counts events that have EVER reached each stage (not just current status).
 * Uses event_state_transitions for accurate historical tracking.
 */
export async function getConversionFunnel(dateRange?: DateRange): Promise<ConversionFunnelData> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get all events in range
  let eventsQuery = db
    .from('events')
    .select('id, status, is_demo')
    .eq('tenant_id', tenantId)
    .eq('is_demo', false)

  if (dateRange?.from) eventsQuery = eventsQuery.gte('created_at', dateRange.from)
  if (dateRange?.to) eventsQuery = eventsQuery.lte('created_at', dateRange.to)

  const { data: events, error: eventsErr } = await eventsQuery

  if (eventsErr || !events) {
    return {
      stages: [],
      totalCreated: 0,
      totalCompleted: 0,
      totalCancelled: 0,
      overallConversionRate: null,
      cancelledByStage: [],
    }
  }

  const eventIds = events.map((e: any) => e.id)
  if (eventIds.length === 0) {
    return {
      stages: [],
      totalCreated: 0,
      totalCompleted: 0,
      totalCancelled: 0,
      overallConversionRate: null,
      cancelledByStage: [],
    }
  }

  // Get all transitions for these events
  const { data: transitions } = await db
    .from('event_state_transitions')
    .select('event_id, from_status, to_status')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  // Build set of stages each event has reached
  const eventStagesReached = new Map<string, Set<string>>()
  for (const event of events) {
    // Every event has at least reached draft
    eventStagesReached.set(event.id, new Set(['draft']))
  }

  if (transitions) {
    for (const t of transitions) {
      const stages = eventStagesReached.get(t.event_id)
      if (stages) {
        stages.add(t.to_status)
        if (t.from_status) stages.add(t.from_status)
      }
    }
  }

  // Count events that reached each stage
  const stageCounts = new Map<string, number>()
  for (const stageKey of STAGE_ORDER) {
    let count = 0
    for (const [, stages] of eventStagesReached) {
      if (stages.has(stageKey)) count++
    }
    stageCounts.set(stageKey, count)
  }

  // Build funnel stages with conversion rates
  const totalCreated = stageCounts.get('draft') ?? 0
  const funnelStages: FunnelStage[] = []
  let prevCount: number | null = null

  for (const key of STAGE_ORDER) {
    const count = stageCounts.get(key) ?? 0
    const conversionFromTop = safePercent(count, totalCreated)
    const conversionFromPrev = prevCount !== null ? safePercent(count, prevCount) : null
    const dropoffFromPrev =
      conversionFromPrev !== null ? Math.round((100 - conversionFromPrev) * 10) / 10 : null

    funnelStages.push({
      key,
      label: STAGE_LABELS[key] ?? key,
      count,
      conversionFromTop,
      conversionFromPrev,
      dropoffFromPrev,
    })
    prevCount = count
  }

  // Cancelled events: determine which stage they were cancelled from
  const cancelledByStageMap = new Map<string, number>()
  if (transitions) {
    for (const t of transitions) {
      if (t.to_status === 'cancelled' && t.from_status) {
        cancelledByStageMap.set(t.from_status, (cancelledByStageMap.get(t.from_status) ?? 0) + 1)
      }
    }
  }
  const cancelledByStage = Array.from(cancelledByStageMap.entries())
    .map(([stage, count]) => ({ stage: STAGE_LABELS[stage] ?? stage, count }))
    .sort((a, b) => b.count - a.count)

  const totalCompleted = stageCounts.get('completed') ?? 0
  const totalCancelled = events.filter((e: any) => e.status === 'cancelled').length

  return {
    stages: funnelStages,
    totalCreated,
    totalCompleted,
    totalCancelled,
    overallConversionRate: safePercent(totalCompleted, totalCreated),
    cancelledByStage,
  }
}

/**
 * Conversion funnel broken down by booking source/channel.
 * Uses events.booking_source (falls back to linked inquiry channel).
 */
export async function getConversionBySource(dateRange?: DateRange): Promise<SourceConversionRow[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  let query = db
    .from('events')
    .select('id, status, booking_source, inquiry_id, is_demo')
    .eq('tenant_id', tenantId)
    .eq('is_demo', false)

  if (dateRange?.from) query = query.gte('created_at', dateRange.from)
  if (dateRange?.to) query = query.lte('created_at', dateRange.to)

  const { data: events } = await query
  if (!events || events.length === 0) return []

  // Get inquiry channels for events that have inquiry_id
  const inquiryIds = events.map((e: any) => e.inquiry_id).filter((id: any): id is string => !!id)

  let inquiryChannelMap = new Map<string, string>()
  if (inquiryIds.length > 0) {
    const { data: inquiries } = await db
      .from('inquiries')
      .select('id, channel')
      .in('id', inquiryIds)

    if (inquiries) {
      for (const inq of inquiries) {
        inquiryChannelMap.set(inq.id, inq.channel)
      }
    }
  }

  // Get transitions to know which stages each event reached
  const eventIds = events.map((e: any) => e.id)
  const { data: transitions } = await db
    .from('event_state_transitions')
    .select('event_id, to_status')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const eventStagesReached = new Map<string, Set<string>>()
  for (const event of events) {
    eventStagesReached.set(event.id, new Set(['draft']))
  }
  if (transitions) {
    for (const t of transitions) {
      eventStagesReached.get(t.event_id)?.add(t.to_status)
    }
  }

  // Group events by source
  const sourceGroups = new Map<string, typeof events>()
  for (const event of events) {
    const source =
      event.booking_source ||
      (event.inquiry_id ? inquiryChannelMap.get(event.inquiry_id) : null) ||
      'unknown'
    if (!sourceGroups.has(source)) sourceGroups.set(source, [])
    sourceGroups.get(source)!.push(event)
  }

  const results: SourceConversionRow[] = []
  for (const [source, groupEvents] of sourceGroups) {
    const total = groupEvents.length
    let proposed = 0,
      accepted = 0,
      paid = 0,
      confirmed = 0,
      completed = 0,
      cancelled = 0

    for (const event of groupEvents) {
      const reached = eventStagesReached.get(event.id) ?? new Set()
      if (reached.has('proposed')) proposed++
      if (reached.has('accepted')) accepted++
      if (reached.has('paid')) paid++
      if (reached.has('confirmed')) confirmed++
      if (reached.has('completed')) completed++
      if (event.status === 'cancelled') cancelled++
    }

    results.push({
      source,
      totalEvents: total,
      proposed,
      accepted,
      paid,
      confirmed,
      completed,
      cancelled,
      conversionRate: safePercent(completed, total),
    })
  }

  return results.sort((a, b) => b.totalEvents - a.totalEvents)
}

/**
 * Average time spent in each stage transition.
 * Uses event_state_transitions timestamps to compute durations.
 */
export async function getAverageTimeInStage(dateRange?: DateRange): Promise<StageTimingRow[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get all transitions, optionally filtered by date
  let query = db
    .from('event_state_transitions')
    .select('event_id, from_status, to_status, transitioned_at')
    .eq('tenant_id', tenantId)
    .order('transitioned_at', { ascending: true })

  if (dateRange?.from) query = query.gte('transitioned_at', dateRange.from)
  if (dateRange?.to) query = query.lte('transitioned_at', dateRange.to)

  const { data: transitions } = await query
  if (!transitions || transitions.length === 0) return []

  // Group transitions by event, ordered by time
  const eventTransitions = new Map<string, Array<{ from: string | null; to: string; at: string }>>()
  for (const t of transitions) {
    if (!eventTransitions.has(t.event_id)) eventTransitions.set(t.event_id, [])
    eventTransitions.get(t.event_id)!.push({
      from: t.from_status,
      to: t.to_status,
      at: t.transitioned_at,
    })
  }

  // For each transition pair, compute durations
  const pairDurations = new Map<string, number[]>()
  for (const pair of TRANSITION_PAIRS) {
    pairDurations.set(`${pair.from}->${pair.to}`, [])
  }

  for (const [, eventTrans] of eventTransitions) {
    // Sort by timestamp
    eventTrans.sort((a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime())

    // For each pair, find the transition into `from` and transition into `to`
    for (const pair of TRANSITION_PAIRS) {
      const key = `${pair.from}->${pair.to}`

      // Find when the event entered the `from` stage
      let enteredFromAt: string | null = null
      let enteredToAt: string | null = null

      for (const t of eventTrans) {
        if (t.to === pair.from && !enteredFromAt) {
          enteredFromAt = t.at
        }
        if (t.to === pair.to && enteredFromAt && !enteredToAt) {
          enteredToAt = t.at
        }
      }

      // Special case: draft is the initial state, use the first transition's timestamp
      if (pair.from === 'draft' && !enteredFromAt) {
        // The event was created in draft. Use the first transition time minus a lookup
        // Actually, draft entry time is event created_at, which we don't have here.
        // Use the first transition FROM draft as the "entered to" and approximate.
        const firstFromDraft = eventTrans.find((t: any) => t.from === 'draft')
        if (firstFromDraft) {
          enteredToAt = firstFromDraft.at
          // We'll skip draft duration since we don't have created_at here
          // Instead, look for the first transition's timestamp as the "exit from draft"
        }
      }

      if (enteredFromAt && enteredToAt) {
        const days =
          (new Date(enteredToAt).getTime() - new Date(enteredFromAt).getTime()) /
          (1000 * 60 * 60 * 24)
        pairDurations.get(key)!.push(days)
      }
    }
  }

  // Build results
  const results: StageTimingRow[] = []
  for (const pair of TRANSITION_PAIRS) {
    const key = `${pair.from}->${pair.to}`
    const durations = pairDurations.get(key)!
    if (durations.length === 0) continue

    durations.sort((a: any, b: any) => a - b)
    const sum = durations.reduce((s: any, d: any) => s + d, 0)
    const avg = sum / durations.length
    const medianIdx = Math.floor(durations.length / 2)
    const median =
      durations.length % 2 === 0
        ? (durations[medianIdx - 1] + durations[medianIdx]) / 2
        : durations[medianIdx]

    results.push({
      fromStage: STAGE_LABELS[pair.from] ?? pair.from,
      toStage: STAGE_LABELS[pair.to] ?? pair.to,
      avgDays: Math.round(avg * 10) / 10,
      medianDays: Math.round(median * 10) / 10,
      minDays: Math.round(Math.min(...durations) * 10) / 10,
      maxDays: Math.round(Math.max(...durations) * 10) / 10,
      transitionCount: durations.length,
    })
  }

  return results
}

/**
 * Monthly conversion rates over time.
 * Groups events by creation month and tracks how many reached completed.
 */
export async function getConversionTrend(months: number = 6): Promise<MonthlyConversionRow[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)
  const startIso = startDate.toISOString()

  const { data: events } = await db
    .from('events')
    .select('id, status, created_at, is_demo')
    .eq('tenant_id', tenantId)
    .eq('is_demo', false)
    .gte('created_at', startIso)

  if (!events || events.length === 0) return []

  // Group by month
  const monthGroups = new Map<string, { created: number; completed: number; cancelled: number }>()
  for (const event of events) {
    const month = dateToMonthString(event.created_at) // YYYY-MM
    if (!monthGroups.has(month)) {
      monthGroups.set(month, { created: 0, completed: 0, cancelled: 0 })
    }
    const group = monthGroups.get(month)!
    group.created++
    if (event.status === 'completed') group.completed++
    if (event.status === 'cancelled') group.cancelled++
  }

  return Array.from(monthGroups.entries())
    .map(([month, data]) => ({
      month,
      created: data.created,
      completed: data.completed,
      cancelled: data.cancelled,
      conversionRate: safePercent(data.completed, data.created),
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Lead quality by source: which channels produce the highest-value bookings.
 * Joins events with event_financial_summary to get revenue per source.
 */
export async function getLeadQualityBySource(): Promise<SourceQualityRow[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get completed events with financials
  const { data: events } = await db
    .from('events')
    .select('id, booking_source, inquiry_id, status, quoted_price_cents, is_demo')
    .eq('tenant_id', tenantId)
    .eq('is_demo', false)

  if (!events || events.length === 0) return []

  // Get inquiry channels for fallback
  const inquiryIds = events.map((e: any) => e.inquiry_id).filter((id: any): id is string => !!id)

  let inquiryChannelMap = new Map<string, string>()
  if (inquiryIds.length > 0) {
    const { data: inquiries } = await db
      .from('inquiries')
      .select('id, channel')
      .in('id', inquiryIds)

    if (inquiries) {
      for (const inq of inquiries) {
        inquiryChannelMap.set(inq.id, inq.channel)
      }
    }
  }

  // Get financial summaries for completed events
  const completedIds = events.filter((e: any) => e.status === 'completed').map((e: any) => e.id)
  let financialMap = new Map<string, number>()
  if (completedIds.length > 0) {
    const { data: financials } = await db
      .from('event_financial_summary')
      .select('event_id, net_revenue_cents')
      .eq('tenant_id', tenantId)
      .in('event_id', completedIds)

    if (financials) {
      for (const f of financials) {
        if (f.event_id) financialMap.set(f.event_id, f.net_revenue_cents ?? 0)
      }
    }
  }

  // Group by source
  const sourceData = new Map<string, { total: number; completed: number; revenueCents: number }>()
  for (const event of events) {
    const source =
      event.booking_source ||
      (event.inquiry_id ? inquiryChannelMap.get(event.inquiry_id) : null) ||
      'unknown'

    if (!sourceData.has(source)) {
      sourceData.set(source, { total: 0, completed: 0, revenueCents: 0 })
    }
    const data = sourceData.get(source)!
    data.total++

    if (event.status === 'completed') {
      data.completed++
      // Use financial summary if available, fall back to quoted price
      const revenue = financialMap.get(event.id) ?? event.quoted_price_cents ?? 0
      data.revenueCents += revenue
    }
  }

  return Array.from(sourceData.entries())
    .map(([source, data]) => ({
      source,
      totalEvents: data.total,
      completedEvents: data.completed,
      totalRevenueCents: data.revenueCents,
      avgRevenueCents: data.completed > 0 ? Math.round(data.revenueCents / data.completed) : 0,
      conversionRate: safePercent(data.completed, data.total),
    }))
    .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)
}

/**
 * Analysis of lost/cancelled deals: at which stage, reasons, lost revenue.
 */
export async function getLostDealsAnalysis(dateRange?: DateRange): Promise<LostDealsAnalysis> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get cancelled events
  let query = db
    .from('events')
    .select(
      'id, occasion, booking_source, cancelled_at, cancellation_reason, quoted_price_cents, is_demo'
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'cancelled')
    .eq('is_demo', false)

  if (dateRange?.from) query = query.gte('created_at', dateRange.from)
  if (dateRange?.to) query = query.lte('created_at', dateRange.to)

  const { data: cancelledEvents } = await query
  if (!cancelledEvents || cancelledEvents.length === 0) {
    return {
      totalLost: 0,
      totalLostRevenueCents: 0,
      lostByStage: [],
      topReasons: [],
      deals: [],
    }
  }

  // Get the cancellation transitions to know from which stage
  const eventIds = cancelledEvents.map((e: any) => e.id)
  const { data: transitions } = await db
    .from('event_state_transitions')
    .select('event_id, from_status, to_status')
    .eq('tenant_id', tenantId)
    .eq('to_status', 'cancelled')
    .in('event_id', eventIds)

  const cancelledFromMap = new Map<string, string>()
  if (transitions) {
    for (const t of transitions) {
      if (t.from_status) cancelledFromMap.set(t.event_id, t.from_status)
    }
  }

  // Build deals list
  const deals: LostDealRow[] = cancelledEvents.map((e: any) => ({
    eventId: e.id,
    occasion: e.occasion,
    source: e.booking_source,
    cancelledAt: e.cancelled_at,
    cancelledAtStage: cancelledFromMap.get(e.id)
      ? (STAGE_LABELS[cancelledFromMap.get(e.id)!] ?? cancelledFromMap.get(e.id)!)
      : null,
    cancellationReason: e.cancellation_reason,
    quotedPriceCents: e.quoted_price_cents,
  }))

  // Lost by stage
  const stageCountMap = new Map<string, { count: number; revenueCents: number }>()
  for (const deal of deals) {
    const stage = deal.cancelledAtStage ?? 'Unknown'
    if (!stageCountMap.has(stage)) stageCountMap.set(stage, { count: 0, revenueCents: 0 })
    const s = stageCountMap.get(stage)!
    s.count++
    s.revenueCents += deal.quotedPriceCents ?? 0
  }
  const lostByStage = Array.from(stageCountMap.entries())
    .map(([stage, data]) => ({ stage, count: data.count, revenueCents: data.revenueCents }))
    .sort((a, b) => b.count - a.count)

  // Top reasons
  const reasonCountMap = new Map<string, number>()
  for (const deal of deals) {
    const reason = deal.cancellationReason?.trim() || 'No reason given'
    reasonCountMap.set(reason, (reasonCountMap.get(reason) ?? 0) + 1)
  }
  const topReasons = Array.from(reasonCountMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const totalLostRevenueCents = cancelledEvents.reduce(
    (sum: any, e: any) => sum + (e.quoted_price_cents ?? 0),
    0
  )

  return {
    totalLost: cancelledEvents.length,
    totalLostRevenueCents,
    lostByStage,
    topReasons,
    deals,
  }
}
