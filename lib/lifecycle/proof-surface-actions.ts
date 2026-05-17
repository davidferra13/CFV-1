// Lifecycle Proof Surface Actions
// Computes lifecycle state from actual data across events, quotes, menus,
// inquiries, and closeouts. Read-only; no mutations.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  LifecycleStage,
  StageProof,
  ProofPoint,
  EventLifecycleState,
  LifecycleOverview,
  LifecycleTimelineEntry,
  LifecycleHealthScore,
} from './proof-surface-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_STAGES: LifecycleStage[] = [
  'inquiry',
  'quoting',
  'contracted',
  'planning',
  'prep',
  'execution',
  'closeout',
  'archived',
]

const STUCK_THRESHOLD_DAYS = 14

function daysBetween(a: string | Date, b: string | Date): number {
  const msPerDay = 86_400_000
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / msPerDay)
}

function eventTitle(ev: Record<string, unknown>): string {
  const occasion = (ev.occasion as string) || 'Event'
  const date = (ev.event_date as string) || ''
  return date ? `${occasion} (${date})` : occasion
}

// ---------------------------------------------------------------------------
// Stage proof builders
// ---------------------------------------------------------------------------

async function buildInquiryProof(
  db: any,
  tenantId: string,
  eventId: string,
  event: Record<string, unknown>
): Promise<StageProof> {
  const proofPoints: ProofPoint[] = []

  // Check if event has an inquiry_id
  const inquiryId = event.inquiry_id as string | null
  let inquiryRow: Record<string, unknown> | null = null
  if (inquiryId) {
    const { data } = await db
      .from('inquiries')
      .select('id, created_at, status')
      .eq('id', inquiryId)
      .eq('tenant_id', tenantId)
      .single()
    inquiryRow = data
  }

  proofPoints.push({
    key: 'inquiry_exists',
    label: 'Inquiry record exists',
    exists: !!inquiryRow,
    entityType: 'inquiry',
    entityId: inquiryRow ? (inquiryRow.id as string) : null,
    timestamp: inquiryRow ? (inquiryRow.created_at as string) : null,
  })

  proofPoints.push({
    key: 'event_created',
    label: 'Event created',
    exists: true,
    entityType: 'event',
    entityId: eventId,
    timestamp: event.created_at as string,
  })

  const reached = proofPoints.some((p) => p.exists)
  const completeness = proofPoints.filter((p) => p.exists).length / proofPoints.length

  return {
    stage: 'inquiry',
    reached,
    reachedAt: inquiryRow ? (inquiryRow.created_at as string) : (event.created_at as string),
    proofPoints,
    completeness,
  }
}

async function buildQuotingProof(
  db: any,
  tenantId: string,
  eventId: string,
  _event: Record<string, unknown>
): Promise<StageProof> {
  const proofPoints: ProofPoint[] = []

  const { data: quotes } = await db
    .from('quotes')
    .select('id, created_at, sent_at, status')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)

  const quote = quotes?.[0] ?? null

  proofPoints.push({
    key: 'quote_created',
    label: 'Quote drafted',
    exists: !!quote,
    entityType: 'quote',
    entityId: quote?.id ?? null,
    timestamp: quote?.created_at ?? null,
  })

  proofPoints.push({
    key: 'quote_sent',
    label: 'Quote sent to client',
    exists: !!quote?.sent_at,
    entityType: 'quote',
    entityId: quote?.id ?? null,
    timestamp: quote?.sent_at ?? null,
  })

  const reached = proofPoints.some((p) => p.exists)
  const completeness = proofPoints.filter((p) => p.exists).length / proofPoints.length

  return {
    stage: 'quoting',
    reached,
    reachedAt: quote?.created_at ?? null,
    proofPoints,
    completeness,
  }
}

async function buildContractedProof(
  db: any,
  tenantId: string,
  eventId: string,
  event: Record<string, unknown>
): Promise<StageProof> {
  const proofPoints: ProofPoint[] = []

  // Check for accepted quote
  const { data: acceptedQuotes } = await db
    .from('quotes')
    .select('id, accepted_at')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .eq('status', 'accepted')
    .limit(1)

  const accepted = acceptedQuotes?.[0] ?? null

  proofPoints.push({
    key: 'quote_accepted',
    label: 'Quote accepted by client',
    exists: !!accepted,
    entityType: 'quote',
    entityId: accepted?.id ?? null,
    timestamp: accepted?.accepted_at ?? null,
  })

  // Check event status is at least 'accepted'
  const contractedStatuses = ['accepted', 'paid', 'confirmed', 'in_progress', 'completed']
  const isContracted = contractedStatuses.includes(event.status as string)

  proofPoints.push({
    key: 'event_accepted',
    label: 'Event status confirmed',
    exists: isContracted,
    entityType: 'event',
    entityId: eventId,
    timestamp: isContracted ? (event.updated_at as string) : null,
  })

  // Check deposit
  const hasDeposit =
    (event.deposit_amount_cents as number | null) != null &&
    (event.deposit_amount_cents as number) > 0

  proofPoints.push({
    key: 'deposit_received',
    label: 'Deposit recorded',
    exists: hasDeposit,
    entityType: 'event',
    entityId: eventId,
    timestamp: hasDeposit ? (event.updated_at as string) : null,
  })

  const reached = proofPoints.some((p) => p.exists)
  const completeness = proofPoints.filter((p) => p.exists).length / proofPoints.length

  return {
    stage: 'contracted',
    reached,
    reachedAt: accepted?.accepted_at ?? (isContracted ? (event.updated_at as string) : null),
    proofPoints,
    completeness,
  }
}

async function buildPlanningProof(
  db: any,
  tenantId: string,
  eventId: string,
  event: Record<string, unknown>
): Promise<StageProof> {
  const proofPoints: ProofPoint[] = []

  // Check for attached menu
  const { data: menus } = await db
    .from('menus')
    .select('id, created_at, status')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .limit(1)

  const menu = menus?.[0] ?? null

  proofPoints.push({
    key: 'menu_attached',
    label: 'Menu attached to event',
    exists: !!menu,
    entityType: 'menu',
    entityId: menu?.id ?? null,
    timestamp: menu?.created_at ?? null,
  })

  // Also check via event.menu_id
  const hasMenuId = !!(event.menu_id as string | null)

  proofPoints.push({
    key: 'menu_linked',
    label: 'Menu linked on event record',
    exists: hasMenuId,
    entityType: 'event',
    entityId: eventId,
    timestamp: hasMenuId ? (event.updated_at as string) : null,
  })

  // Guest count confirmed
  proofPoints.push({
    key: 'guest_count_confirmed',
    label: 'Guest count confirmed',
    exists: !!(event.guest_count_confirmed as boolean),
    entityType: 'event',
    entityId: eventId,
    timestamp: event.guest_count_confirmed ? (event.updated_at as string) : null,
  })

  const reached = proofPoints.some((p) => p.exists)
  const completeness = proofPoints.filter((p) => p.exists).length / proofPoints.length

  return {
    stage: 'planning',
    reached,
    reachedAt: menu?.created_at ?? (hasMenuId ? (event.updated_at as string) : null),
    proofPoints,
    completeness,
  }
}

async function buildPrepProof(
  _db: any,
  _tenantId: string,
  eventId: string,
  event: Record<string, unknown>
): Promise<StageProof> {
  const proofPoints: ProofPoint[] = []

  proofPoints.push({
    key: 'grocery_list_ready',
    label: 'Grocery list ready',
    exists: !!(event.grocery_list_ready as boolean),
    entityType: 'event',
    entityId: eventId,
    timestamp: event.grocery_list_ready ? (event.updated_at as string) : null,
  })

  proofPoints.push({
    key: 'prep_list_ready',
    label: 'Prep list ready',
    exists: !!(event.prep_list_ready as boolean),
    entityType: 'event',
    entityId: eventId,
    timestamp: event.prep_list_ready ? (event.updated_at as string) : null,
  })

  proofPoints.push({
    key: 'shopping_started',
    label: 'Shopping started',
    exists: !!(event.shopping_started_at as string | null),
    entityType: 'event',
    entityId: eventId,
    timestamp: event.shopping_started_at as string | null,
  })

  proofPoints.push({
    key: 'prep_started',
    label: 'Prep started',
    exists: !!(event.prep_started_at as string | null),
    entityType: 'event',
    entityId: eventId,
    timestamp: event.prep_started_at as string | null,
  })

  proofPoints.push({
    key: 'car_packed',
    label: 'Car packed',
    exists: !!(event.car_packed as boolean),
    entityType: 'event',
    entityId: eventId,
    timestamp: event.car_packed_at as string | null,
  })

  const reached = proofPoints.some((p) => p.exists)
  const completeness = proofPoints.filter((p) => p.exists).length / proofPoints.length

  return {
    stage: 'prep',
    reached,
    reachedAt:
      (event.shopping_started_at as string | null) ??
      (event.prep_started_at as string | null) ??
      null,
    proofPoints,
    completeness,
  }
}

async function buildExecutionProof(
  _db: any,
  _tenantId: string,
  eventId: string,
  event: Record<string, unknown>
): Promise<StageProof> {
  const proofPoints: ProofPoint[] = []

  proofPoints.push({
    key: 'service_started',
    label: 'Service started',
    exists: !!(event.service_started_at as string | null),
    entityType: 'event',
    entityId: eventId,
    timestamp: event.service_started_at as string | null,
  })

  proofPoints.push({
    key: 'service_completed',
    label: 'Service completed',
    exists: !!(event.service_completed_at as string | null),
    entityType: 'event',
    entityId: eventId,
    timestamp: event.service_completed_at as string | null,
  })

  const isInProgress = (event.status as string) === 'in_progress'
  proofPoints.push({
    key: 'status_in_progress',
    label: 'Event marked in progress',
    exists: isInProgress || !!(event.service_started_at as string | null),
    entityType: 'event',
    entityId: eventId,
    timestamp: event.service_started_at as string | null,
  })

  const reached = proofPoints.some((p) => p.exists)
  const completeness = proofPoints.filter((p) => p.exists).length / proofPoints.length

  return {
    stage: 'execution',
    reached,
    reachedAt: event.service_started_at as string | null,
    proofPoints,
    completeness,
  }
}

async function buildCloseoutProof(
  db: any,
  tenantId: string,
  eventId: string,
  event: Record<string, unknown>
): Promise<StageProof> {
  const proofPoints: ProofPoint[] = []

  // Check event_closeouts table
  const { data: closeouts } = await db
    .from('event_closeouts')
    .select('id, status, initiated_at, finalized_at')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .limit(1)

  const closeout = closeouts?.[0] ?? null

  proofPoints.push({
    key: 'closeout_initiated',
    label: 'Closeout initiated',
    exists: !!closeout,
    entityType: 'event_closeout',
    entityId: closeout?.id ?? null,
    timestamp: closeout?.initiated_at ?? null,
  })

  proofPoints.push({
    key: 'closeout_finalized',
    label: 'Closeout finalized',
    exists: closeout?.status === 'finalized' || closeout?.status === 'completed',
    entityType: 'event_closeout',
    entityId: closeout?.id ?? null,
    timestamp: closeout?.finalized_at ?? null,
  })

  proofPoints.push({
    key: 'financially_closed',
    label: 'Financially closed',
    exists: !!(event.financially_closed as boolean),
    entityType: 'event',
    entityId: eventId,
    timestamp: event.financially_closed ? (event.updated_at as string) : null,
  })

  proofPoints.push({
    key: 'follow_up_sent',
    label: 'Follow-up sent',
    exists: !!(event.follow_up_sent as boolean),
    entityType: 'event',
    entityId: eventId,
    timestamp: event.follow_up_sent_at as string | null,
  })

  proofPoints.push({
    key: 'aar_filed',
    label: 'After-action review filed',
    exists: !!(event.aar_filed as boolean),
    entityType: 'event',
    entityId: eventId,
    timestamp: event.aar_filed ? (event.updated_at as string) : null,
  })

  const reached = proofPoints.some((p) => p.exists)
  const completeness = proofPoints.filter((p) => p.exists).length / proofPoints.length

  return {
    stage: 'closeout',
    reached,
    reachedAt: closeout?.initiated_at ?? null,
    proofPoints,
    completeness,
  }
}

async function buildArchivedProof(
  _db: any,
  _tenantId: string,
  eventId: string,
  event: Record<string, unknown>
): Promise<StageProof> {
  const proofPoints: ProofPoint[] = []

  const isArchived = !!(event.archived as boolean)
  const isCompleted = (event.status as string) === 'completed'

  proofPoints.push({
    key: 'event_completed',
    label: 'Event status completed',
    exists: isCompleted || isArchived,
    entityType: 'event',
    entityId: eventId,
    timestamp: isCompleted || isArchived ? (event.updated_at as string) : null,
  })

  proofPoints.push({
    key: 'event_archived',
    label: 'Event archived',
    exists: isArchived,
    entityType: 'event',
    entityId: eventId,
    timestamp: isArchived ? (event.updated_at as string) : null,
  })

  const reached = proofPoints.some((p) => p.exists)
  const completeness = proofPoints.filter((p) => p.exists).length / proofPoints.length

  return {
    stage: 'archived',
    reached,
    reachedAt: isArchived ? (event.updated_at as string) : null,
    proofPoints,
    completeness,
  }
}

// ---------------------------------------------------------------------------
// Stage builders map
// ---------------------------------------------------------------------------

const STAGE_BUILDERS: Record<
  LifecycleStage,
  (
    db: any,
    tenantId: string,
    eventId: string,
    event: Record<string, unknown>
  ) => Promise<StageProof>
> = {
  inquiry: buildInquiryProof,
  quoting: buildQuotingProof,
  contracted: buildContractedProof,
  planning: buildPlanningProof,
  prep: buildPrepProof,
  execution: buildExecutionProof,
  closeout: buildCloseoutProof,
  archived: buildArchivedProof,
}

// ---------------------------------------------------------------------------
// Determine current stage from proof
// ---------------------------------------------------------------------------

function determineCurrentStage(stages: StageProof[]): LifecycleStage {
  // Walk backwards; the last reached stage is current
  for (let i = stages.length - 1; i >= 0; i--) {
    if (stages[i].reached) {
      return stages[i].stage
    }
  }
  return 'inquiry'
}

function computeNextActions(stages: StageProof[], currentStage: LifecycleStage): string[] {
  const actions: string[] = []
  const currentIdx = ALL_STAGES.indexOf(currentStage)
  const current = stages[currentIdx]

  // Find incomplete proof points in current stage
  for (const pp of current.proofPoints) {
    if (!pp.exists) {
      actions.push(pp.label)
    }
  }

  // If current stage is fully complete, suggest next stage entry
  if (current.completeness === 1 && currentIdx < ALL_STAGES.length - 1) {
    const next = ALL_STAGES[currentIdx + 1]
    actions.push(`Advance to ${next}`)
  }

  return actions.slice(0, 5)
}

// ---------------------------------------------------------------------------
// Public Actions
// ---------------------------------------------------------------------------

/**
 * Compute full lifecycle state for a single event from actual data.
 */
export async function getEventLifecycleState(eventId: string): Promise<EventLifecycleState> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  const stages: StageProof[] = []
  for (const stage of ALL_STAGES) {
    const proof = await STAGE_BUILDERS[stage](db, user.tenantId!, eventId, event)
    stages.push(proof)
  }

  const currentStage = determineCurrentStage(stages)
  const nextActions = computeNextActions(stages, currentStage)

  // Calculate overall progress: weighted by stage position
  const reachedCount = stages.filter((s) => s.reached).length
  const overallProgress = Math.round((reachedCount / ALL_STAGES.length) * 100)

  // Days in current stage
  const currentProof = stages.find((s) => s.stage === currentStage)!
  const stageEnteredAt = currentProof.reachedAt ?? (event.created_at as string)
  const daysInCurrentStage = daysBetween(stageEnteredAt, new Date().toISOString())

  return {
    eventId,
    eventTitle: eventTitle(event),
    currentStage,
    stages,
    overallProgress,
    nextActions,
    daysInCurrentStage,
  }
}

/**
 * Overview of all events grouped by lifecycle stage, with stuck detection.
 */
export async function getLifecycleOverview(): Promise<LifecycleOverview> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: allEvents } = await db
    .from('events')
    .select(
      'id, occasion, event_date, status, created_at, updated_at, cancelled_at, archived, inquiry_id, menu_id, deposit_amount_cents, guest_count_confirmed, grocery_list_ready, prep_list_ready, shopping_started_at, prep_started_at, car_packed, service_started_at, service_completed_at, financially_closed, follow_up_sent, aar_filed'
    )
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: false })

  if (!allEvents || allEvents.length === 0) {
    const emptyStages = Object.fromEntries(ALL_STAGES.map((s) => [s, 0])) as Record<
      LifecycleStage,
      number
    >
    const emptyAvg = Object.fromEntries(ALL_STAGES.map((s) => [s, 0])) as Record<
      LifecycleStage,
      number
    >
    return { byStage: emptyStages, stuckEvents: [], avgDaysPerStage: emptyAvg }
  }

  const byStage = Object.fromEntries(ALL_STAGES.map((s) => [s, 0])) as Record<
    LifecycleStage,
    number
  >
  const stuckEvents: LifecycleOverview['stuckEvents'] = []
  const stageDayTotals = Object.fromEntries(
    ALL_STAGES.map((s) => [s, { total: 0, count: 0 }])
  ) as Record<LifecycleStage, { total: number; count: number }>

  for (const ev of allEvents) {
    // Skip cancelled events
    if (ev.cancelled_at) continue

    const currentStage = determineCurrentStageFromEvent(ev)
    byStage[currentStage]++

    const enteredAt = estimateStageEnteredAt(ev, currentStage)
    const days = daysBetween(enteredAt, new Date().toISOString())

    stageDayTotals[currentStage].total += days
    stageDayTotals[currentStage].count++

    if (
      days >= STUCK_THRESHOLD_DAYS &&
      currentStage !== 'archived' &&
      currentStage !== 'closeout'
    ) {
      stuckEvents.push({
        eventId: ev.id,
        title: eventTitle(ev),
        stage: currentStage,
        daysStuck: days,
      })
    }
  }

  const avgDaysPerStage = Object.fromEntries(
    ALL_STAGES.map((s) => [
      s,
      stageDayTotals[s].count > 0
        ? Math.round(stageDayTotals[s].total / stageDayTotals[s].count)
        : 0,
    ])
  ) as Record<LifecycleStage, number>

  // Sort stuck events by days descending
  stuckEvents.sort((a, b) => b.daysStuck - a.daysStuck)

  return { byStage, stuckEvents, avgDaysPerStage }
}

/**
 * Detailed proof points for a single stage of an event.
 */
export async function getStageProof(eventId: string, stage: LifecycleStage): Promise<StageProof> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  const builder = STAGE_BUILDERS[stage]
  if (!builder) {
    throw new Error(`Unknown lifecycle stage: ${stage}`)
  }

  return builder(db, user.tenantId!, eventId, event)
}

/**
 * Chronological stage transitions for an event.
 * Reconstructs timeline from proof data.
 */
export async function getLifecycleTimeline(eventId: string): Promise<LifecycleTimelineEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  const stages: StageProof[] = []
  for (const stage of ALL_STAGES) {
    const proof = await STAGE_BUILDERS[stage](db, user.tenantId!, eventId, event)
    stages.push(proof)
  }

  const timeline: LifecycleTimelineEntry[] = []

  for (let i = 0; i < stages.length; i++) {
    const s = stages[i]
    if (!s.reached || !s.reachedAt) continue

    // Exit time is when the next reached stage was entered
    let exitedAt: string | null = null
    for (let j = i + 1; j < stages.length; j++) {
      if (stages[j].reached && stages[j].reachedAt) {
        exitedAt = stages[j].reachedAt
        break
      }
    }

    const durationDays = exitedAt ? daysBetween(s.reachedAt, exitedAt) : null

    timeline.push({
      stage: s.stage,
      enteredAt: s.reachedAt,
      exitedAt,
      durationDays,
      proofPoints: s.proofPoints,
    })
  }

  return timeline
}

/**
 * Overall lifecycle health: events progressing vs stuck, bottlenecks.
 */
export async function getLifecycleHealthScore(): Promise<LifecycleHealthScore> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: allEvents } = await db
    .from('events')
    .select(
      'id, occasion, event_date, status, created_at, updated_at, cancelled_at, archived, inquiry_id, menu_id, deposit_amount_cents, guest_count_confirmed, grocery_list_ready, prep_list_ready, shopping_started_at, prep_started_at, car_packed, service_started_at, service_completed_at, financially_closed, follow_up_sent, aar_filed'
    )
    .eq('tenant_id', user.tenantId!)

  if (!allEvents || allEvents.length === 0) {
    const emptyAvg = Object.fromEntries(ALL_STAGES.map((s) => [s, 0])) as Record<
      LifecycleStage,
      number
    >
    return {
      totalEvents: 0,
      activeEvents: 0,
      stuckCount: 0,
      progressingCount: 0,
      healthPercent: 100,
      avgDaysPerStage: emptyAvg,
      bottleneckStage: null,
    }
  }

  // Filter out cancelled
  const active = allEvents.filter((e: Record<string, unknown>) => !e.cancelled_at)
  const totalEvents = allEvents.length
  const activeEvents = active.length

  let stuckCount = 0
  let progressingCount = 0
  const stageDayTotals = Object.fromEntries(
    ALL_STAGES.map((s) => [s, { total: 0, count: 0 }])
  ) as Record<LifecycleStage, { total: number; count: number }>
  const stageCounts = Object.fromEntries(ALL_STAGES.map((s) => [s, 0])) as Record<
    LifecycleStage,
    number
  >

  for (const ev of active) {
    const currentStage = determineCurrentStageFromEvent(ev)
    stageCounts[currentStage]++

    const enteredAt = estimateStageEnteredAt(ev, currentStage)
    const days = daysBetween(enteredAt, new Date().toISOString())

    stageDayTotals[currentStage].total += days
    stageDayTotals[currentStage].count++

    if (days >= STUCK_THRESHOLD_DAYS && currentStage !== 'archived') {
      stuckCount++
    } else {
      progressingCount++
    }
  }

  const avgDaysPerStage = Object.fromEntries(
    ALL_STAGES.map((s) => [
      s,
      stageDayTotals[s].count > 0
        ? Math.round(stageDayTotals[s].total / stageDayTotals[s].count)
        : 0,
    ])
  ) as Record<LifecycleStage, number>

  // Bottleneck: non-terminal stage with most events stuck
  let bottleneckStage: LifecycleStage | null = null
  let maxStuck = 0
  for (const stage of ALL_STAGES) {
    if (stage === 'archived' || stage === 'closeout') continue
    if (stageCounts[stage] > maxStuck) {
      maxStuck = stageCounts[stage]
      bottleneckStage = stage
    }
  }

  const healthPercent = activeEvents > 0 ? Math.round((progressingCount / activeEvents) * 100) : 100

  return {
    totalEvents,
    activeEvents,
    stuckCount,
    progressingCount,
    healthPercent,
    avgDaysPerStage,
    bottleneckStage,
  }
}

// ---------------------------------------------------------------------------
// Lightweight stage determination (no DB queries, for overview/health)
// ---------------------------------------------------------------------------

function determineCurrentStageFromEvent(ev: Record<string, unknown>): LifecycleStage {
  if (ev.archived) return 'archived'
  if ((ev.status as string) === 'completed') return 'archived'

  // Closeout signals
  if (ev.financially_closed || ev.aar_filed || ev.follow_up_sent) return 'closeout'

  // Execution signals
  if (ev.service_started_at || (ev.status as string) === 'in_progress') return 'execution'

  // Prep signals
  if (ev.shopping_started_at || ev.prep_started_at || ev.grocery_list_ready || ev.car_packed)
    return 'prep'

  // Planning signals
  if (ev.menu_id || ev.guest_count_confirmed) return 'planning'

  // Contracted signals
  const contractedStatuses = ['accepted', 'paid', 'confirmed']
  if (contractedStatuses.includes(ev.status as string)) return 'contracted'
  if ((ev.deposit_amount_cents as number | null) != null && (ev.deposit_amount_cents as number) > 0)
    return 'contracted'

  // Quoting: check via status (proposed means quote sent)
  if ((ev.status as string) === 'proposed') return 'quoting'

  return 'inquiry'
}

function estimateStageEnteredAt(ev: Record<string, unknown>, stage: LifecycleStage): string {
  switch (stage) {
    case 'execution':
      return (ev.service_started_at as string) ?? (ev.updated_at as string)
    case 'prep':
      return (
        (ev.shopping_started_at as string) ??
        (ev.prep_started_at as string) ??
        (ev.updated_at as string)
      )
    case 'closeout':
      return (ev.service_completed_at as string) ?? (ev.updated_at as string)
    case 'archived':
      return ev.updated_at as string
    default:
      return (ev.created_at as string) ?? (ev.updated_at as string)
  }
}
