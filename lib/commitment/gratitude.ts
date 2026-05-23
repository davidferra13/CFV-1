import { createServerClient } from '@/lib/db/server'

// -- Types --------------------------------------------------------------------

export type GratitudeActionType =
  | 'vendor_thank_you'
  | 'client_thank_you'
  | 'team_recognition'
  | 'venue_thanks'

export interface GratitudeAction {
  id: string
  tenantId: string
  eventId: string
  actionType: GratitudeActionType
  recipientName: string | null
  note: string | null
  completedAt: Date
}

export interface GratitudeViolation {
  actionType: GratitudeActionType
  eventId: string
  description: string
  deadline: Date
  hoursOverdue: number
}

export interface GratitudeStatus {
  tenantId: string
  period: string
  totalEvents: number
  fullyCompliant: number
  compliancePercent: number
  overdue: GratitudeViolation[]
  actionCounts: Record<GratitudeActionType, number>
}

export interface ReliabilityCorrelation {
  tenantId: string
  gratitudeComplianceRate: number
  vendorReliabilityRate: number
  clientReturnRate: number
  correlationStrength: 'strong' | 'moderate' | 'weak' | 'insufficient_data'
  insight: string
}

// -- Helpers ------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function getQuarterKey(date: Date): string {
  const q = Math.ceil((date.getMonth() + 1) / 3)
  return `${date.getFullYear()}-Q${q}`
}

function getPeriodRange(period: string): { start: Date; end: Date } {
  const match = period.match(/^(\d{4})-Q(\d)$/)
  if (match) {
    const year = parseInt(match[1], 10)
    const quarter = parseInt(match[2], 10)
    const startMonth = (quarter - 1) * 3
    return {
      start: new Date(year, startMonth, 1),
      end: new Date(year, startMonth + 3, 0, 23, 59, 59, 999),
    }
  }
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  const startMonth = (q - 1) * 3
  return {
    start: new Date(now.getFullYear(), startMonth, 1),
    end: new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999),
  }
}

const GRATITUDE_DEADLINES: Record<GratitudeActionType, number> = {
  client_thank_you: 24,
  vendor_thank_you: 48,
  team_recognition: 48,
  venue_thanks: 48,
}

const GRATITUDE_DESCRIPTIONS: Record<GratitudeActionType, string> = {
  client_thank_you: 'Personal thank-you to client',
  vendor_thank_you: 'Thank vendor(s) for service',
  team_recognition: 'Recognize team contributions',
  venue_thanks: 'Thank host/venue',
}

// -- Core Functions -----------------------------------------------------------

/**
 * Check gratitude compliance for a specific event.
 * Returns overdue gratitude actions.
 */
export async function checkGratitudeCompliance(
  tenantId: string,
  eventId: string
): Promise<GratitudeViolation[]> {
  const client = createServerClient()
  const violations: GratitudeViolation[] = []

  const { data: eventRow } = await client
    .from('events' as any)
    .select('*')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!eventRow) return violations

  const eventStatus = (eventRow as any).status
  if (!['completed', 'closed'].includes(eventStatus)) return violations

  const eventDate = new Date(
    (eventRow as any).date || (eventRow as any).completed_at || (eventRow as any).updated_at
  )
  const now = new Date()
  const hoursSinceEvent = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60)

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('rule')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const hasGratitudeCommitment = (commitmentRows ?? []).some((r: any) => {
    const rule = typeof r.rule === 'string' ? JSON.parse(r.rule) : r.rule
    return rule.type === 'post_event_followup_within' || rule.type === 'gratitude_ritual'
  })

  if (!hasGratitudeCommitment) return violations

  const { data: actions } = await client
    .from('commitment_gratitude_actions' as any)
    .select('action_type')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)

  const completedTypes = new Set((actions ?? []).map((a: any) => a.action_type))

  for (const [actionType, deadlineHours] of Object.entries(GRATITUDE_DEADLINES)) {
    if (completedTypes.has(actionType)) continue
    if (hoursSinceEvent <= deadlineHours) continue

    const deadline = new Date(eventDate)
    deadline.setHours(deadline.getHours() + deadlineHours)

    violations.push({
      actionType: actionType as GratitudeActionType,
      eventId,
      description: `${GRATITUDE_DESCRIPTIONS[actionType as GratitudeActionType]} overdue (${deadlineHours}hr deadline)`,
      deadline,
      hoursOverdue: Math.round(hoursSinceEvent - deadlineHours),
    })
  }

  return violations
}

/**
 * Get gratitude compliance status across events in a period.
 */
export async function getGratitudeStatus(
  tenantId: string,
  period?: string
): Promise<GratitudeStatus> {
  const currentPeriod = period ?? getQuarterKey(new Date())
  const { start, end } = getPeriodRange(currentPeriod)
  const client = createServerClient()

  const { data: events } = await client
    .from('events' as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'closed'])
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  const eventIds = (events ?? []).map((e: any) => e.id)

  const { data: actions } = await client
    .from('commitment_gratitude_actions' as any)
    .select('event_id, action_type')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds.length > 0 ? eventIds : ['__none__'])

  const actionCounts: Record<GratitudeActionType, number> = {
    vendor_thank_you: 0,
    client_thank_you: 0,
    team_recognition: 0,
    venue_thanks: 0,
  }

  const eventCompletions: Record<string, Set<string>> = {}
  for (const a of actions ?? []) {
    const eid = (a as any).event_id
    const atype = (a as any).action_type as GratitudeActionType
    if (!eventCompletions[eid]) eventCompletions[eid] = new Set()
    eventCompletions[eid].add(atype)
    if (atype in actionCounts) actionCounts[atype]++
  }

  const requiredCount = Object.keys(GRATITUDE_DEADLINES).length
  const fullyCompliant = eventIds.filter(
    (eid: string) => (eventCompletions[eid]?.size ?? 0) >= requiredCount
  ).length

  const overdue: GratitudeViolation[] = []
  for (const eid of eventIds) {
    const eventViolations = await checkGratitudeCompliance(tenantId, eid)
    overdue.push(...eventViolations)
  }

  return {
    tenantId,
    period: currentPeriod,
    totalEvents: eventIds.length,
    fullyCompliant,
    compliancePercent:
      eventIds.length > 0 ? Math.round((fullyCompliant / eventIds.length) * 100) : 100,
    overdue,
    actionCounts,
  }
}

/**
 * Record a gratitude action for an event.
 */
export async function recordGratitudeAction(
  tenantId: string,
  eventId: string,
  action: {
    actionType: GratitudeActionType
    recipientName?: string
    note?: string
  }
): Promise<GratitudeAction> {
  const client = createServerClient()
  const id = generateId()
  const now = new Date().toISOString()

  await client.from('commitment_gratitude_actions' as any).insert({
    id,
    tenant_id: tenantId,
    event_id: eventId,
    action_type: action.actionType,
    recipient_name: action.recipientName ?? null,
    note: action.note ?? null,
    completed_at: now,
  })

  return {
    id,
    tenantId,
    eventId,
    actionType: action.actionType,
    recipientName: action.recipientName ?? null,
    note: action.note ?? null,
    completedAt: new Date(now),
  }
}

/**
 * Analyze correlation between gratitude compliance and relationship reliability.
 */
export async function getReliabilityCorrelation(tenantId: string): Promise<ReliabilityCorrelation> {
  const client = createServerClient()
  const status = await getGratitudeStatus(tenantId)
  const gratitudeRate = status.compliancePercent

  const { data: allEvents } = await client
    .from('events' as any)
    .select('client_id')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')

  let clientReturnRate = 0
  if (allEvents && allEvents.length > 0) {
    const clientCounts: Record<string, number> = {}
    for (const e of allEvents) {
      const cid = (e as any).client_id
      if (cid) clientCounts[cid] = (clientCounts[cid] ?? 0) + 1
    }
    const totalClients = Object.keys(clientCounts).length
    const repeatClients = Object.values(clientCounts).filter((c) => c >= 2).length
    clientReturnRate = totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0
  }

  const totalEvents = status.totalEvents
  let correlationStrength: ReliabilityCorrelation['correlationStrength'] = 'insufficient_data'
  let insight = 'Not enough data to determine correlation. Keep tracking gratitude actions.'

  if (totalEvents >= 10) {
    if (gratitudeRate >= 80 && clientReturnRate >= 50) {
      correlationStrength = 'strong'
      insight = 'High gratitude compliance correlates with strong client retention.'
    } else if (gratitudeRate >= 60 && clientReturnRate >= 30) {
      correlationStrength = 'moderate'
      insight = 'Moderate gratitude practice shows positive client relationship trends.'
    } else {
      correlationStrength = 'weak'
      insight = 'Gratitude compliance needs improvement to see relationship benefits.'
    }
  }

  return {
    tenantId,
    gratitudeComplianceRate: gratitudeRate,
    vendorReliabilityRate: 0,
    clientReturnRate,
    correlationStrength,
    insight,
  }
}
