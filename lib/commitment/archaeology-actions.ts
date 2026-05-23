'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getActiveCommitments } from '@/lib/commitment/engine'
import { describeRule } from '@/lib/commitment/rule-descriptions'
import type { Commitment, CommitmentRule } from '@/lib/commitment/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

function fail<T>(error: string): ActionResult<T> {
  return { success: false, error }
}

function ok<T>(data?: T): ActionResult<T> {
  return { success: true, data }
}

export interface SimulatedEvent {
  eventId: string
  eventDate: string
  status: string
  guestCount: number | null
  /** Which commitments this event would have violated */
  violations: SimulatedViolation[]
  /** Whether the event fully complied with all active commitments */
  compliant: boolean
}

export interface SimulatedViolation {
  commitmentId: string
  domain: string
  ruleType: string
  ruleDescription: string
  /** Human-readable explanation of why this event would have triggered friction */
  explanation: string
}

export interface RetroSimulationResult {
  /** Total events evaluated */
  totalEvents: number
  /** Events that would have been fully compliant */
  compliantEvents: number
  /** Events that would have triggered at least one friction check */
  violatingEvents: number
  /** Compliance rate as a percentage (0-100) */
  complianceRate: number
  /** Per-commitment violation counts */
  commitmentBreakdown: {
    commitmentId: string
    domain: string
    ruleDescription: string
    violationCount: number
    /** Percentage of events that violated this commitment */
    violationRate: number
  }[]
  /** Monthly breakdown for trend visualization */
  monthlyBreakdown: {
    month: string
    totalEvents: number
    compliantEvents: number
    complianceRate: number
  }[]
  /** The events with details (capped at 200 for performance) */
  events: SimulatedEvent[]
}

export interface ActualVsCommittedResult {
  /** How many events occurred that would violate current rules */
  divergenceCount: number
  /** Total events in the window */
  totalEvents: number
  /** Per-domain divergence summary */
  byDomain: {
    domain: string
    actualBehavior: string
    committedStandard: string
    divergenceCount: number
    worstOffender: { eventId: string; eventDate: string; explanation: string } | null
  }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
}

interface EventRow {
  id: string
  event_date: string | null
  status: string
  guest_count: number | null
  occasion: string | null
}

/**
 * Evaluate a single event against a commitment rule.
 * Returns a violation explanation or null if compliant.
 */
function evaluateEventAgainstRule(
  event: EventRow,
  rule: CommitmentRule,
  weekEventCounts: Map<string, number>,
  consecutiveDaysMap: Map<string, number>
): string | null {
  if (!event.event_date) return null

  switch (rule.type) {
    case 'max_events_per_week': {
      const week = getISOWeek(new Date(event.event_date))
      const count = weekEventCounts.get(week) ?? 0
      if (count > rule.limit) {
        return `Week ${week} had ${count} events, exceeding limit of ${rule.limit}`
      }
      return null
    }
    case 'max_consecutive_work_days': {
      const dayKey = new Date(event.event_date).toISOString().slice(0, 10)
      const consecutive = consecutiveDaysMap.get(dayKey) ?? 1
      if (consecutive > rule.limit) {
        return `Part of a ${consecutive}-day consecutive work stretch, exceeding limit of ${rule.limit}`
      }
      return null
    }
    case 'max_guests_without_sous': {
      if (event.guest_count != null && event.guest_count > rule.limit) {
        return `${event.guest_count} guests without sous chef, exceeding limit of ${rule.limit}`
      }
      return null
    }
    case 'say_no_min_event_value': {
      // Cannot fully evaluate without pricing data; skip
      return null
    }
    default:
      return null
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Run a retrospective simulation: "if current commitments had been active
 * for the last 12 months, what would have happened?"
 *
 * Queries completed/confirmed events from the past year and evaluates each
 * against currently active commitment rules.
 */
export async function runRetroSimulation(): Promise<ActionResult<RetroSimulationResult>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const db = createServerClient()

    // Get active commitments
    const commitments = await getActiveCommitments(tenantId)
    if (commitments.length === 0) {
      return ok({
        totalEvents: 0,
        compliantEvents: 0,
        violatingEvents: 0,
        complianceRate: 100,
        commitmentBreakdown: [],
        monthlyBreakdown: [],
        events: [],
      })
    }

    // Get events from the last 12 months
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

    const { data: eventRows } = await db
      .from('events' as any)
      .select('id, event_date, status, guest_count, occasion')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .gte('event_date', twelveMonthsAgo.toISOString())
      .order('event_date', { ascending: true })

    const events: EventRow[] = (eventRows ?? []) as any[]
    if (events.length === 0) {
      return ok({
        totalEvents: 0,
        compliantEvents: 0,
        violatingEvents: 0,
        complianceRate: 100,
        commitmentBreakdown: [],
        monthlyBreakdown: [],
        events: [],
      })
    }

    // Pre-compute scheduling context maps
    const weekEventCounts = new Map<string, number>()
    const dateSorted: string[] = []

    for (const ev of events) {
      if (!ev.event_date) continue
      const week = getISOWeek(new Date(ev.event_date))
      weekEventCounts.set(week, (weekEventCounts.get(week) ?? 0) + 1)
      dateSorted.push(new Date(ev.event_date).toISOString().slice(0, 10))
    }

    // Compute consecutive work day stretches
    const uniqueDates = [...new Set(dateSorted)].sort()
    const consecutiveDaysMap = new Map<string, number>()
    let streakStart = 0

    for (let i = 0; i < uniqueDates.length; i++) {
      if (i > 0) {
        const prev = new Date(uniqueDates[i - 1]!)
        const curr = new Date(uniqueDates[i]!)
        const diffDays = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
        if (diffDays !== 1) {
          streakStart = i
        }
      }
      const streakLength = i - streakStart + 1
      consecutiveDaysMap.set(uniqueDates[i]!, streakLength)
    }

    // Evaluate each event against each commitment
    const violationCounts = new Map<string, number>()
    const monthlyStats = new Map<string, { total: number; compliant: number }>()
    const simulatedEvents: SimulatedEvent[] = []

    for (const ev of events) {
      const violations: SimulatedViolation[] = []

      for (const commitment of commitments) {
        const explanation = evaluateEventAgainstRule(
          ev,
          commitment.rule,
          weekEventCounts,
          consecutiveDaysMap
        )
        if (explanation) {
          violations.push({
            commitmentId: commitment.id,
            domain: commitment.domain,
            ruleType: commitment.rule.type,
            ruleDescription: describeRule(commitment.rule),
            explanation,
          })
          violationCounts.set(commitment.id, (violationCounts.get(commitment.id) ?? 0) + 1)
        }
      }

      const compliant = violations.length === 0

      if (ev.event_date) {
        const month = getMonthKey(new Date(ev.event_date))
        const stat = monthlyStats.get(month) ?? { total: 0, compliant: 0 }
        stat.total++
        if (compliant) stat.compliant++
        monthlyStats.set(month, stat)
      }

      if (simulatedEvents.length < 200) {
        simulatedEvents.push({
          eventId: ev.id,
          eventDate: ev.event_date ?? '',
          status: ev.status,
          guestCount: ev.guest_count,
          violations,
          compliant,
        })
      }
    }

    const compliantCount = simulatedEvents.filter((e) => e.compliant).length
    const violatingCount = simulatedEvents.length - compliantCount

    const commitmentBreakdown = commitments.map((c) => ({
      commitmentId: c.id,
      domain: c.domain,
      ruleDescription: describeRule(c.rule),
      violationCount: violationCounts.get(c.id) ?? 0,
      violationRate:
        events.length > 0
          ? Math.round(((violationCounts.get(c.id) ?? 0) / events.length) * 1000) / 10
          : 0,
    }))

    const monthlyBreakdown = [...monthlyStats.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, stat]) => ({
        month,
        totalEvents: stat.total,
        compliantEvents: stat.compliant,
        complianceRate:
          stat.total > 0 ? Math.round((stat.compliant / stat.total) * 1000) / 10 : 100,
      }))

    return ok({
      totalEvents: events.length,
      compliantEvents: compliantCount,
      violatingEvents: violatingCount,
      complianceRate:
        events.length > 0 ? Math.round((compliantCount / events.length) * 1000) / 10 : 100,
      commitmentBreakdown,
      monthlyBreakdown,
      events: simulatedEvents,
    })
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to run retro simulation')
  }
}

/**
 * Get cached/stored simulation results (returns the same as runRetroSimulation).
 * Future: could cache results to avoid re-running expensive queries.
 */
export async function getSimulationResults(): Promise<ActionResult<RetroSimulationResult>> {
  return runRetroSimulation()
}

/**
 * Show divergence between actual historical behavior and current commitment standards.
 * Groups by domain and identifies the worst offending events per domain.
 */
export async function compareActualVsCommitted(
  monthsBack?: number
): Promise<ActionResult<ActualVsCommittedResult>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const db = createServerClient()

    const lookbackMonths = monthsBack ?? 12
    const since = new Date()
    since.setMonth(since.getMonth() - lookbackMonths)

    const commitments = await getActiveCommitments(tenantId)
    if (commitments.length === 0) {
      return ok({ divergenceCount: 0, totalEvents: 0, byDomain: [] })
    }

    const { data: eventRows } = await db
      .from('events' as any)
      .select('id, event_date, status, guest_count, occasion')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .gte('event_date', since.toISOString())
      .order('event_date', { ascending: true })

    const events: EventRow[] = (eventRows ?? []) as any[]
    if (events.length === 0) {
      return ok({ divergenceCount: 0, totalEvents: 0, byDomain: [] })
    }

    // Pre-compute scheduling context
    const weekEventCounts = new Map<string, number>()
    const uniqueDates: string[] = []

    for (const ev of events) {
      if (!ev.event_date) continue
      const week = getISOWeek(new Date(ev.event_date))
      weekEventCounts.set(week, (weekEventCounts.get(week) ?? 0) + 1)
      uniqueDates.push(new Date(ev.event_date).toISOString().slice(0, 10))
    }

    const sorted = [...new Set(uniqueDates)].sort()
    const consecutiveDaysMap = new Map<string, number>()
    let sStart = 0
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        const prev = new Date(sorted[i - 1]!)
        const curr = new Date(sorted[i]!)
        if ((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000) !== 1) {
          sStart = i
        }
      }
      consecutiveDaysMap.set(sorted[i]!, i - sStart + 1)
    }

    // Group commitments by domain
    const domainCommitments = new Map<string, Commitment[]>()
    for (const c of commitments) {
      const arr = domainCommitments.get(c.domain) ?? []
      arr.push(c)
      domainCommitments.set(c.domain, arr)
    }

    let totalDivergence = 0
    const byDomain: ActualVsCommittedResult['byDomain'] = []

    for (const [domain, domainCmts] of domainCommitments) {
      let domainViolations = 0
      let worstOffender: ActualVsCommittedResult['byDomain'][0]['worstOffender'] = null
      let worstViolationCount = 0

      for (const ev of events) {
        let eventViolationCount = 0
        let lastExplanation = ''

        for (const commitment of domainCmts) {
          const explanation = evaluateEventAgainstRule(
            ev,
            commitment.rule,
            weekEventCounts,
            consecutiveDaysMap
          )
          if (explanation) {
            eventViolationCount++
            lastExplanation = explanation
          }
        }

        if (eventViolationCount > 0) {
          domainViolations++
          if (eventViolationCount > worstViolationCount) {
            worstViolationCount = eventViolationCount
            worstOffender = {
              eventId: ev.id,
              eventDate: ev.event_date ?? '',
              explanation: lastExplanation,
            }
          }
        }
      }

      totalDivergence += domainViolations

      // Build human-readable summaries
      const ruleDescriptions = domainCmts.map((c) => describeRule(c.rule))
      const committedStandard = ruleDescriptions.join('; ')
      const actualBehavior =
        domainViolations === 0
          ? 'Fully aligned with committed standards'
          : `${domainViolations} of ${events.length} events diverged from committed standards`

      byDomain.push({
        domain,
        actualBehavior,
        committedStandard,
        divergenceCount: domainViolations,
        worstOffender,
      })
    }

    return ok({
      divergenceCount: totalDivergence,
      totalEvents: events.length,
      byDomain,
    })
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to compare actual vs committed')
  }
}
