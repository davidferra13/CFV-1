import { createServerClient } from '@/lib/db/server'

// -- Types --------------------------------------------------------------------

export type EducationRuleType =
  | 'timeline_transparency'
  | 'pricing_transparency'
  | 'scope_confirmation'
  | 'limitation_honesty'

export interface EducationViolation {
  ruleType: EducationRuleType
  eventId: string
  description: string
  suggestedAction: string
}

export interface EducationStatus {
  tenantId: string
  totalEvents: number
  compliantEvents: number
  compliancePercent: number
  gapsByRule: Record<EducationRuleType, number>
}

export interface EducationGap {
  eventId: string
  eventName: string | null
  missingRules: EducationRuleType[]
  daysSinceEvent: number
}

// -- Constants ----------------------------------------------------------------

const EDUCATION_RULE_TYPES: EducationRuleType[] = [
  'timeline_transparency',
  'pricing_transparency',
  'scope_confirmation',
  'limitation_honesty',
]

const RULE_DESCRIPTIONS: Record<EducationRuleType, { violation: string; action: string }> = {
  timeline_transparency: {
    violation: 'Realistic prep timeline not shared with client',
    action: 'Share a prep timeline breakdown showing realistic hours and lead times',
  },
  pricing_transparency: {
    violation: 'Pricing component explanation not provided',
    action: 'Explain what makes up the per-head price (food, labor, travel, etc.)',
  },
  scope_confirmation: {
    violation: 'Scope not re-confirmed after changes',
    action: 'Send updated scope summary to client for confirmation',
  },
  limitation_honesty: {
    violation: 'Took on work beyond capability without referral',
    action: 'Refer requests beyond your expertise to a qualified colleague',
  },
}

// -- Core Functions -----------------------------------------------------------

/**
 * Check whether an event meets client education commitments.
 * Evaluates: timeline shared, pricing explained, scope confirmed, limitations honest.
 */
export async function checkEducationCompliance(
  tenantId: string,
  eventId: string
): Promise<EducationViolation[]> {
  const client = createServerClient()
  const violations: EducationViolation[] = []

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const activeEducationRules = (commitmentRows ?? [])
    .map((r: any) => (typeof r.rule === 'string' ? JSON.parse(r.rule) : r.rule))
    .filter((r: any) => EDUCATION_RULE_TYPES.includes(r.type))
    .map((r: any) => r.type as EducationRuleType)

  if (activeEducationRules.length === 0) return violations

  const { data: records } = await client
    .from('commitment_education_records' as any)
    .select('rule_type')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)

  const completedRules = new Set((records ?? []).map((r: any) => r.rule_type))

  for (const ruleType of activeEducationRules) {
    if (!completedRules.has(ruleType)) {
      const desc = RULE_DESCRIPTIONS[ruleType as EducationRuleType]
      violations.push({
        ruleType,
        eventId,
        description: desc.violation,
        suggestedAction: desc.action,
      })
    }
  }

  return violations
}

/**
 * Get overall education compliance status across recent events.
 */
export async function getEducationStatus(tenantId: string): Promise<EducationStatus> {
  const client = createServerClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: events } = await client
    .from('events' as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'completed', 'closed'])
    .gte('created_at', ninetyDaysAgo.toISOString())

  const eventIds = (events ?? []).map((e: any) => e.id)
  if (eventIds.length === 0) {
    return {
      tenantId,
      totalEvents: 0,
      compliantEvents: 0,
      compliancePercent: 100,
      gapsByRule: {
        timeline_transparency: 0,
        pricing_transparency: 0,
        scope_confirmation: 0,
        limitation_honesty: 0,
      },
    }
  }

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('rule')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const activeRules = (commitmentRows ?? [])
    .map((r: any) => (typeof r.rule === 'string' ? JSON.parse(r.rule) : r.rule))
    .filter((r: any) => EDUCATION_RULE_TYPES.includes(r.type))
    .map((r: any) => r.type as EducationRuleType)

  if (activeRules.length === 0) {
    return {
      tenantId,
      totalEvents: eventIds.length,
      compliantEvents: eventIds.length,
      compliancePercent: 100,
      gapsByRule: {
        timeline_transparency: 0,
        pricing_transparency: 0,
        scope_confirmation: 0,
        limitation_honesty: 0,
      },
    }
  }

  const { data: records } = await client
    .from('commitment_education_records' as any)
    .select('event_id, rule_type')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const eventCompletions: Record<string, Set<string>> = {}
  for (const r of records ?? []) {
    const eid = (r as any).event_id
    if (!eventCompletions[eid]) eventCompletions[eid] = new Set()
    eventCompletions[eid].add((r as any).rule_type)
  }

  const gapsByRule: Record<EducationRuleType, number> = {
    timeline_transparency: 0,
    pricing_transparency: 0,
    scope_confirmation: 0,
    limitation_honesty: 0,
  }

  let compliantEvents = 0
  for (const eid of eventIds) {
    const completed = eventCompletions[eid] ?? new Set()
    let allMet = true
    for (const rule of activeRules) {
      if (!completed.has(rule)) {
        gapsByRule[rule as EducationRuleType]++
        allMet = false
      }
    }
    if (allMet) compliantEvents++
  }

  return {
    tenantId,
    totalEvents: eventIds.length,
    compliantEvents,
    compliancePercent: Math.round((compliantEvents / eventIds.length) * 100),
    gapsByRule,
  }
}

/**
 * Get events that are missing education compliance steps.
 */
export async function getEducationGaps(tenantId: string): Promise<EducationGap[]> {
  const client = createServerClient()
  const now = new Date()

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('rule')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const activeRules = (commitmentRows ?? [])
    .map((r: any) => (typeof r.rule === 'string' ? JSON.parse(r.rule) : r.rule))
    .filter((r: any) => EDUCATION_RULE_TYPES.includes(r.type))
    .map((r: any) => r.type as EducationRuleType)

  if (activeRules.length === 0) return []

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: events } = await client
    .from('events' as any)
    .select('id, name, created_at')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'in_progress', 'completed'])
    .gte('created_at', thirtyDaysAgo.toISOString())

  if (!events || events.length === 0) return []

  const eventIds = events.map((e: any) => e.id)

  const { data: records } = await client
    .from('commitment_education_records' as any)
    .select('event_id, rule_type')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const completionMap: Record<string, Set<string>> = {}
  for (const r of records ?? []) {
    const eid = (r as any).event_id
    if (!completionMap[eid]) completionMap[eid] = new Set()
    completionMap[eid].add((r as any).rule_type)
  }

  const gaps: EducationGap[] = []
  for (const event of events) {
    const completed = completionMap[(event as any).id] ?? new Set()
    const missingRules = activeRules.filter((r: string) => !completed.has(r))

    if (missingRules.length > 0) {
      const eventDate = new Date((event as any).created_at)
      gaps.push({
        eventId: (event as any).id,
        eventName: (event as any).name ?? null,
        missingRules,
        daysSinceEvent: Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24)),
      })
    }
  }

  gaps.sort((a, b) => a.daysSinceEvent - b.daysSinceEvent)
  return gaps
}
