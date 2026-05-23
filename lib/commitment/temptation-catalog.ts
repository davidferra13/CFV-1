import { createServerClient } from '@/lib/db/server'
import type { CommitmentDomain, OverrideCategory } from '@/lib/commitment/types'

// ── Temptation Catalog (#30) ─────────────────────────────────────────────────
// Learns override triggers. Analyzes commitment_overrides for pattern detection
// across time-of-day, day-of-week, client-type, event-proximity, season, and
// fatigue-level dimensions.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export type TemptationTrigger =
  | 'time-of-day'
  | 'day-of-week'
  | 'client-type'
  | 'event-proximity'
  | 'season'
  | 'fatigue-level'

export interface TemptationRecord {
  id: string
  tenantId: string
  trigger: TemptationTrigger
  domain: CommitmentDomain
  overrideCategory: OverrideCategory | null
  context: Record<string, unknown>
  createdAt: Date
}

export interface TemptationProfile {
  tenantId: string
  totalOverrides: number
  triggerDistribution: Record<TemptationTrigger, number>
  dominantTrigger: TemptationTrigger | null
  weakestDomain: CommitmentDomain | null
  riskWindows: { trigger: TemptationTrigger; detail: string }[]
}

export interface TemptationRisk {
  riskLevel: number
  activeFactors: { trigger: TemptationTrigger; weight: number; reason: string }[]
  recommendation: string
}

/**
 * Record a temptation trigger when an override occurs.
 */
export async function recordTemptation(
  tenantId: string,
  trigger: TemptationTrigger,
  domain: CommitmentDomain,
  overrideCategory: OverrideCategory | null,
  context?: Record<string, unknown>
): Promise<TemptationRecord> {
  const record: TemptationRecord = {
    id: generateId(),
    tenantId,
    trigger,
    domain,
    overrideCategory,
    context: context ?? {},
    createdAt: new Date(),
  }

  const client = createServerClient()
  await client.from('commitment_temptations' as any).insert({
    id: record.id,
    tenant_id: tenantId,
    trigger: record.trigger,
    domain: record.domain,
    override_category: record.overrideCategory,
    context: JSON.stringify(record.context),
    created_at: record.createdAt.toISOString(),
  })

  return record
}

/**
 * Build a temptation profile from override history.
 * Analyzes commitment_overrides to classify triggers retroactively.
 */
export async function getTemptationProfile(tenantId: string): Promise<TemptationProfile> {
  const client = createServerClient()

  // Get overrides
  const { data: overrides } = await client
    .from('commitment_overrides' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const allOverrides = (overrides ?? []) as any[]

  // Get commitments for domain lookup
  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('id, domain')
    .eq('tenant_id', tenantId)

  const commitmentDomainMap = new Map<string, CommitmentDomain>()
  for (const c of (commitmentRows ?? []) as any[]) {
    commitmentDomainMap.set(c.id as string, c.domain as CommitmentDomain)
  }

  const triggerDistribution: Record<TemptationTrigger, number> = {
    'time-of-day': 0,
    'day-of-week': 0,
    'client-type': 0,
    'event-proximity': 0,
    season: 0,
    'fatigue-level': 0,
  }

  // Classify each override by likely trigger
  for (const o of allOverrides) {
    const createdAt = new Date(o.created_at)
    const hour = createdAt.getHours()
    const day = createdAt.getDay()
    const category = o.category as OverrideCategory | null

    if (hour >= 22 || hour <= 5) {
      triggerDistribution['time-of-day']++
    }
    if (day === 0 || day === 6) {
      triggerDistribution['day-of-week']++
    }
    if (category === 'client_request') {
      triggerDistribution['client-type']++
    }
    if (category === 'time_constraint' || category === 'scheduling_cascade') {
      triggerDistribution['event-proximity']++
    }
    if (category === 'financial_pressure') {
      triggerDistribution['season']++
    }
    if (category === 'simplified_service' || category === 'chef_judgment') {
      triggerDistribution['fatigue-level']++
    }
  }

  // Find dominant trigger
  let dominantTrigger: TemptationTrigger | null = null
  let maxCount = 0
  for (const [trigger, count] of Object.entries(triggerDistribution)) {
    if (count > maxCount) {
      maxCount = count
      dominantTrigger = trigger as TemptationTrigger
    }
  }

  // Find weakest domain (most overrides)
  const domainCounts = new Map<CommitmentDomain, number>()
  for (const o of allOverrides) {
    const domain = commitmentDomainMap.get(o.commitment_id as string)
    if (domain) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1)
    }
  }

  let weakestDomain: CommitmentDomain | null = null
  let maxDomainCount = 0
  for (const [domain, count] of domainCounts) {
    if (count > maxDomainCount) {
      maxDomainCount = count
      weakestDomain = domain
    }
  }

  // Build risk windows
  const riskWindows: { trigger: TemptationTrigger; detail: string }[] = []
  if (triggerDistribution['time-of-day'] >= 3) {
    riskWindows.push({ trigger: 'time-of-day', detail: 'Late night decisions correlate with overrides' })
  }
  if (triggerDistribution['day-of-week'] >= 3) {
    riskWindows.push({ trigger: 'day-of-week', detail: 'Weekend overrides are frequent' })
  }
  if (triggerDistribution['fatigue-level'] >= 3) {
    riskWindows.push({ trigger: 'fatigue-level', detail: 'Consecutive work periods trigger quality shortcuts' })
  }

  return {
    tenantId,
    totalOverrides: allOverrides.length,
    triggerDistribution,
    dominantTrigger: maxCount > 0 ? dominantTrigger : null,
    weakestDomain,
    riskWindows,
  }
}

/**
 * Get the top N override triggers ranked by frequency.
 */
export async function getTopTriggers(
  tenantId: string,
  limit: number = 5
): Promise<{ trigger: TemptationTrigger; count: number; percentage: number }[]> {
  const profile = await getTemptationProfile(tenantId)

  const entries = Object.entries(profile.triggerDistribution)
    .map(([trigger, count]) => ({
      trigger: trigger as TemptationTrigger,
      count,
      percentage: profile.totalOverrides > 0
        ? Math.round((count / profile.totalOverrides) * 1000) / 10
        : 0,
    }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  return entries
}

/**
 * Predict temptation risk for a given context.
 */
export async function predictTemptationRisk(
  tenantId: string,
  context: {
    hour?: number
    dayOfWeek?: number
    daysUntilNextEvent?: number
    consecutiveWorkDays?: number
    isRepeatClient?: boolean
  }
): Promise<TemptationRisk> {
  const profile = await getTemptationProfile(tenantId)
  const activeFactors: TemptationRisk['activeFactors'] = []

  if (profile.totalOverrides === 0) {
    return { riskLevel: 0, activeFactors: [], recommendation: 'No override history to analyze yet.' }
  }

  const total = profile.totalOverrides

  if (context.hour !== undefined && (context.hour >= 22 || context.hour <= 5)) {
    const weight = Math.min((profile.triggerDistribution['time-of-day'] / total) * 100, 40)
    if (weight > 5) {
      activeFactors.push({
        trigger: 'time-of-day',
        weight,
        reason: `${profile.triggerDistribution['time-of-day']} past overrides happened at similar hours`,
      })
    }
  }

  if (context.dayOfWeek !== undefined && (context.dayOfWeek === 0 || context.dayOfWeek === 6)) {
    const weight = Math.min((profile.triggerDistribution['day-of-week'] / total) * 100, 30)
    if (weight > 5) {
      activeFactors.push({
        trigger: 'day-of-week',
        weight,
        reason: `Weekends have historically triggered ${profile.triggerDistribution['day-of-week']} overrides`,
      })
    }
  }

  if (context.daysUntilNextEvent !== undefined && context.daysUntilNextEvent <= 2) {
    const weight = Math.min((profile.triggerDistribution['event-proximity'] / total) * 100, 40)
    if (weight > 5) {
      activeFactors.push({
        trigger: 'event-proximity',
        weight,
        reason: `Proximity to events correlates with ${profile.triggerDistribution['event-proximity']} past overrides`,
      })
    }
  }

  if (context.consecutiveWorkDays !== undefined && context.consecutiveWorkDays >= 4) {
    const weight = Math.min((profile.triggerDistribution['fatigue-level'] / total) * 100, 50)
    if (weight > 5) {
      activeFactors.push({
        trigger: 'fatigue-level',
        weight,
        reason: `${context.consecutiveWorkDays} consecutive work days; fatigue caused ${profile.triggerDistribution['fatigue-level']} past overrides`,
      })
    }
  }

  if (context.isRepeatClient) {
    const weight = Math.min((profile.triggerDistribution['client-type'] / total) * 100, 25)
    if (weight > 5) {
      activeFactors.push({
        trigger: 'client-type',
        weight,
        reason: `Client requests have driven ${profile.triggerDistribution['client-type']} past overrides`,
      })
    }
  }

  const riskLevel = Math.min(
    Math.round(activeFactors.reduce((sum, f) => sum + f.weight, 0)),
    100
  )

  let recommendation = 'Low risk. Proceed normally.'
  if (riskLevel >= 70) {
    recommendation = 'High override risk. Consider delaying this decision or adding a cooling-off period.'
  } else if (riskLevel >= 40) {
    recommendation = 'Moderate risk. Be mindful of your override patterns in this context.'
  }

  return { riskLevel, activeFactors, recommendation }
}
