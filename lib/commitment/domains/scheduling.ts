import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type SchedulingContext = {
  eventDate: string
  eventCount7Days: number
  consecutiveWorkDays: number
  sameDayEvents?: number
  currentHour?: number
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function mapCommitmentRow(row: any): Commitment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    source: row.source,
    rule: row.rule,
    status: row.status,
    frictionLevel: row.friction_level,
    overrideCount: row.override_count,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at) : null,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    futureSelfletter: row.future_self_letter,
    seasonalProfile: row.seasonal_profile,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function calculateFrictionTier(overrides: any[]): FrictionTier {
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000

  const in30 = overrides.filter((o) => new Date(o.created_at).getTime() > thirtyDaysAgo).length
  const in60 = overrides.filter((o) => new Date(o.created_at).getTime() > sixtyDaysAgo).length
  const in90 = overrides.filter((o) => new Date(o.created_at).getTime() > ninetyDaysAgo).length

  if (in90 >= 8) return 5
  if (in90 >= 5) return 4
  if (in60 >= 3) return 3
  if (in30 >= 2) return 2
  return 1
}

function countOverridesInWindow(overrides: any[]): {
  last30: number
  last60: number
  last90: number
} {
  const now = Date.now()
  return {
    last30: overrides.filter(
      (o: any) => new Date(o.created_at).getTime() > now - 30 * 24 * 60 * 60 * 1000
    ).length,
    last60: overrides.filter(
      (o: any) => new Date(o.created_at).getTime() > now - 60 * 24 * 60 * 60 * 1000
    ).length,
    last90: overrides.filter(
      (o: any) => new Date(o.created_at).getTime() > now - 90 * 24 * 60 * 60 * 1000
    ).length,
  }
}

const RULE_DESCRIPTIONS: Record<string, string> = {
  max_events_per_week: 'Weekly event count exceeds your committed limit',
  max_consecutive_work_days: 'Consecutive work days exceed your committed limit',
  no_same_day_doubles_after: 'Same-day double booking after your committed cutoff hour',
}

export async function evaluateSchedulingCommitments(
  tenantId: string,
  context: SchedulingContext
): Promise<FrictionCheckResult[]> {
  const client = createServerClient()
  const results: FrictionCheckResult[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'scheduling')
    .eq('status', 'active')

  if (!rows || rows.length === 0) return results

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'max_events_per_week') {
      violated = context.eventCount7Days >= (rule.limit ?? Infinity)
    } else if (rule.type === 'max_consecutive_work_days') {
      violated = context.consecutiveWorkDays >= (rule.limit ?? Infinity)
    } else if (rule.type === 'no_same_day_doubles_after') {
      if (
        context.sameDayEvents != null &&
        context.sameDayEvents > 0 &&
        context.currentHour != null
      ) {
        violated = context.currentHour >= (rule.hour ?? 24)
      }
    }

    if (!violated) continue

    const { data: overrideRows } = await client
      .from('commitment_overrides' as any)
      .select('*')
      .eq('commitment_id', commitment.id)
      .order('created_at', { ascending: false })

    const overrides = overrideRows || []
    const tier = calculateFrictionTier(overrides)

    results.push({
      blocked: false,
      tier,
      commitment,
      streakAtRisk: commitment.currentStreak > 0 ? commitment.currentStreak : null,
      overridesInWindow: countOverridesInWindow(overrides),
      hasConsequenceCorrelation: false,
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Scheduling commitment violated',
    })
  }

  return results
}

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

export async function getSchedulingSuggestions(tenantId: string): Promise<CommitmentSuggestion[]> {
  const client = createServerClient()
  const suggestions: CommitmentSuggestion[] = []
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const { data: events } = await client
    .from('events' as any)
    .select('id, event_date, status')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .gte('event_date', ninetyDaysAgo.toISOString())
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) return suggestions

  const weekCounts = new Map<string, number>()
  for (const event of events) {
    if (!event.event_date) continue
    const week = getISOWeek(new Date(event.event_date))
    weekCounts.set(week, (weekCounts.get(week) || 0) + 1)
  }

  const hasHeavyWeek = [...weekCounts.values()].some((count) => count >= 4)
  if (hasHeavyWeek) {
    suggestions.push({
      id: generateId(),
      tenantId,
      domain: 'scheduling',
      suggestedRule: { type: 'max_events_per_week', limit: 3 },
      rationale:
        'You had weeks with 4+ events in the last 90 days. A cap at 3 protects prep quality and prevents burnout.',
      evidence: { weekCounts: Object.fromEntries(weekCounts) },
      status: 'pending',
      respondedAt: null,
      dismissedReason: null,
      createdAt: new Date(),
    })
  }

  const eventDates: string[] = events
    .map((e: any) => e.event_date as string)
    .filter(Boolean)
    .map((d: string) => new Date(d).toISOString().slice(0, 10))

  const uniqueDates: string[] = [...new Set(eventDates)].sort()
  let maxConsecutive = 1
  let current = 1

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1] as string)
    const curr = new Date(uniqueDates[i] as string)
    const diffDays = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)

    if (diffDays === 1) {
      current++
      if (current > maxConsecutive) maxConsecutive = current
    } else {
      current = 1
    }
  }

  if (maxConsecutive > 6) {
    suggestions.push({
      id: generateId(),
      tenantId,
      domain: 'scheduling',
      suggestedRule: { type: 'max_consecutive_work_days', limit: 5 },
      rationale: `You had a stretch of ${maxConsecutive} consecutive work days. Capping at 5 ensures at least one rest day per week.`,
      evidence: { maxConsecutiveStretch: maxConsecutive },
      status: 'pending',
      respondedAt: null,
      dismissedReason: null,
      createdAt: new Date(),
    })
  }

  return suggestions
}
