import { createServerClient } from '@/lib/db/server'
import type { Commitment, CommitmentDomain } from './types'
import { DOMAIN_LABELS } from './types'

// ── #36 Remy Commitment Coach: Morning Briefing ─────────────────────────────
// Commitment status snapshot for daily briefing.
// Remy illuminates, never judges.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export type CommitmentWeather = 'clear' | 'cloudy' | 'stormy'

export interface CapacityWarning {
  domain: CommitmentDomain
  label: string
  message: string
}

export interface PendingVerification {
  commitmentId: string
  domain: CommitmentDomain
  ruleType: string
  daysPending: number
}

export interface StreakUpdate {
  commitmentId: string
  domain: CommitmentDomain
  currentStreak: number
  nextMilestone: number
  daysToMilestone: number
}

export interface PressureDay {
  date: string
  commitmentCount: number
  domains: CommitmentDomain[]
}

export interface MorningBriefing {
  id: string
  tenantId: string
  date: string
  capacityWarnings: CapacityWarning[]
  pendingVerifications: PendingVerification[]
  streakUpdates: StreakUpdate[]
  pressureForecast: PressureDay[]
  commitmentWeather: CommitmentWeather
  generatedAt: Date
}

const STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365]

function getNextMilestone(current: number): number {
  for (const m of STREAK_MILESTONES) {
    if (m > current) return m
  }
  return current + 90
}

function mapCommitmentRow(row: any): Commitment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    source: row.source,
    rule: typeof row.rule === 'string' ? JSON.parse(row.rule) : row.rule,
    status: row.status,
    frictionLevel: row.friction_level,
    overrideCount: row.override_count ?? 0,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at) : null,
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    futureSelfletter: row.future_self_letter ?? null,
    seasonalProfile: row.seasonal_profile ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function determineWeather(
  overrideCount: number,
  warningCount: number,
  activeCount: number
): CommitmentWeather {
  if (activeCount === 0) return 'clear'
  const pressure = (overrideCount * 2 + warningCount) / Math.max(activeCount, 1)
  if (pressure >= 1.5) return 'stormy'
  if (pressure >= 0.5) return 'cloudy'
  return 'clear'
}

export async function generateMorningBriefing(
  tenantId: string,
  date: Date = new Date()
): Promise<MorningBriefing> {
  const client = createServerClient()
  const dateStr = date.toISOString().split('T')[0]

  // Fetch active commitments
  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const commitments = (commitmentRows || []).map(mapCommitmentRow)

  // Fetch recent overrides (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const { data: overrideRows } = await client
    .from('commitment_overrides' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', sevenDaysAgo.toISOString())

  const recentOverrides = overrideRows || []

  // Capacity warnings: domains with high override counts recently
  const capacityWarnings: CapacityWarning[] = []
  const domainOverrideCounts = new Map<CommitmentDomain, number>()

  for (const o of recentOverrides) {
    // Find the commitment for this override to get its domain
    const commitment = commitments.find((c: Commitment) => c.id === (o as any).commitment_id)
    if (commitment) {
      const count = domainOverrideCounts.get(commitment.domain) || 0
      domainOverrideCounts.set(commitment.domain, count + 1)
    }
  }

  for (const [domain, count] of domainOverrideCounts) {
    if (count >= 2) {
      capacityWarnings.push({
        domain,
        label: DOMAIN_LABELS[domain],
        message: `${count} overrides in ${DOMAIN_LABELS[domain]} this week. Might be worth checking if workload is sustainable.`,
      })
    }
  }

  // Pending verifications: commitments with zero streak (never verified)
  const pendingVerifications: PendingVerification[] = []
  for (const c of commitments) {
    if (c.currentStreak === 0 && c.overrideCount === 0) {
      const daysSinceCreation = Math.floor(
        (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceCreation >= 1) {
        const rule = c.rule as Record<string, any>
        pendingVerifications.push({
          commitmentId: c.id,
          domain: c.domain,
          ruleType: rule.type,
          daysPending: daysSinceCreation,
        })
      }
    }
  }

  // Streak updates: commitments approaching milestones
  const streakUpdates: StreakUpdate[] = []
  for (const c of commitments) {
    if (c.currentStreak > 0) {
      const nextMilestone = getNextMilestone(c.currentStreak)
      const daysToMilestone = nextMilestone - c.currentStreak
      if (daysToMilestone <= 7) {
        streakUpdates.push({
          commitmentId: c.id,
          domain: c.domain,
          currentStreak: c.currentStreak,
          nextMilestone,
          daysToMilestone,
        })
      }
    }
  }

  // Pressure forecast: next 7 days (based on scheduling commitments)
  const pressureForecast: PressureDay[] = []
  const schedulingCommitments = commitments.filter(
    (c: Commitment) => c.domain === 'scheduling' || c.domain === 'capacity'
  )
  if (schedulingCommitments.length > 0) {
    for (let i = 0; i < 7; i++) {
      const forecastDate = new Date(date)
      forecastDate.setDate(forecastDate.getDate() + i)
      const domains = new Set<CommitmentDomain>()
      for (const c of schedulingCommitments) {
        domains.add(c.domain)
      }
      if (domains.size > 0) {
        pressureForecast.push({
          date: forecastDate.toISOString().split('T')[0],
          commitmentCount: schedulingCommitments.length,
          domains: [...domains],
        })
      }
    }
  }

  // Weather
  const commitmentWeather = determineWeather(
    recentOverrides.length,
    capacityWarnings.length,
    commitments.length
  )

  return {
    id: generateId(),
    tenantId,
    date: dateStr,
    capacityWarnings,
    pendingVerifications,
    streakUpdates,
    pressureForecast,
    commitmentWeather,
    generatedAt: new Date(),
  }
}
