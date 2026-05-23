import { createServerClient } from '@/lib/db/server'
import type { Commitment, CommitmentDomain } from './types'
import { DOMAIN_LABELS } from './types'

// #47 Client-Facing Commitment Transparency
// Optional public commitment exposure. Trust differentiation through
// visible integrity. Generates profile badges, contract addenda,
// and post-event commitment reports.

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

export interface PublicCommitment {
  domain: CommitmentDomain
  domainLabel: string
  publicDescription: string
  streakDays: number
  integrityScore: number
}

export interface ProfileBadge {
  tenantId: string
  integrityScore: number
  level: 'bronze' | 'silver' | 'gold' | 'platinum'
  activeCommitmentCount: number
  longestStreak: number
  domainsWithCommitments: CommitmentDomain[]
  generatedAt: Date
}

export interface ContractAddendumItem {
  domain: CommitmentDomain
  domainLabel: string
  promise: string
  streak: number
}

export interface ContractAddendum {
  tenantId: string
  eventId: string
  items: ContractAddendumItem[]
  generatedAt: Date
}

export interface PostEventCommitmentItem {
  domain: CommitmentDomain
  domainLabel: string
  promise: string
  honored: boolean
  detail: string
}

export interface PostEventReport {
  tenantId: string
  eventId: string
  items: PostEventCommitmentItem[]
  honoredCount: number
  totalCount: number
  integrityPercent: number
  generatedAt: Date
}

const PUBLIC_DESCRIPTIONS: Record<string, string> = {
  pricing_floor: 'Consistent, fair pricing on every event',
  margin_floor: 'Transparent cost management',
  no_late_discounts: 'Price stability, no last-minute pressure tactics',
  max_events_per_week: 'Controlled schedule for focused attention',
  min_rest_days: 'Rest built in so every event gets full energy',
  allergens_verified_before_confirm: 'Allergen verification before every event',
  cross_contamination_check_required: 'Cross-contamination safety protocols',
  recipe_tested_before_serve: 'Every dish tested before it reaches your table',
  plating_standards_documented: 'Documented presentation standards',
  ingredient_quality_floor: 'Minimum ingredient quality guaranteed',
  response_time_sla: 'Reliable communication response times',
  no_radio_silence: 'Consistent, proactive communication',
  invoice_within_days: 'Prompt, professional invoicing',
  max_guests_without_sous: 'Appropriate staffing for event size',
  emergency_contacts_before_confirm: 'Contingency planning for every event',
  menu_lock_cooldown: 'Thoughtful menu finalization process',
}

function getPublicDescription(ruleType: string): string {
  return PUBLIC_DESCRIPTIONS[ruleType] || 'Professional standard maintained'
}

function calculateIntegrity(commitment: Commitment): number {
  const streakWeight = Math.min(commitment.currentStreak / 90, 1.0) * 50
  const totalDecisions = commitment.currentStreak + commitment.overrideCount
  const overrideRate =
    commitment.overrideCount > 0
      ? Math.max(0, 1 - commitment.overrideCount / Math.max(totalDecisions, 1))
      : 1
  const overrideWeight = overrideRate * 30
  const ageDays = (Date.now() - commitment.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  const ageWeight = Math.min(ageDays / 180, 1.0) * 20

  return Math.round(streakWeight + overrideWeight + ageWeight)
}

function badgeLevel(score: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (score >= 90) return 'platinum'
  if (score >= 75) return 'gold'
  if (score >= 50) return 'silver'
  return 'bronze'
}

export async function getPublicCommitments(
  tenantId: string
): Promise<PublicCommitment[]> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const commitments = (rows || []).map(mapCommitmentRow)

  const eligible = commitments.filter(
    (c: Commitment) => c.currentStreak >= 7 || (c.overrideCount === 0 && c.currentStreak >= 0)
  )

  return eligible.map((c: Commitment) => {
    const rule = c.rule as Record<string, any>
    return {
      domain: c.domain,
      domainLabel: DOMAIN_LABELS[c.domain],
      publicDescription: getPublicDescription(rule.type),
      streakDays: c.currentStreak,
      integrityScore: calculateIntegrity(c),
    }
  })
}

export async function generateProfileBadge(
  tenantId: string
): Promise<ProfileBadge> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const commitments = (rows || []).map(mapCommitmentRow)

  if (commitments.length === 0) {
    return {
      tenantId,
      integrityScore: 0,
      level: 'bronze',
      activeCommitmentCount: 0,
      longestStreak: 0,
      domainsWithCommitments: [],
      generatedAt: new Date(),
    }
  }

  const scores = commitments.map(calculateIntegrity)
  const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
  const maxStreak = Math.max(...commitments.map((c: Commitment) => c.longestStreak))
  const domains = [...new Set(commitments.map((c: Commitment) => c.domain))] as CommitmentDomain[]

  return {
    tenantId,
    integrityScore: avgScore,
    level: badgeLevel(avgScore),
    activeCommitmentCount: commitments.length,
    longestStreak: maxStreak,
    domainsWithCommitments: domains,
    generatedAt: new Date(),
  }
}

export async function generateContractAddendum(
  tenantId: string,
  eventId: string
): Promise<ContractAddendum> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const commitments = (rows || []).map(mapCommitmentRow)

  const eventDomains: CommitmentDomain[] = [
    'quality',
    'dietary',
    'communication',
    'capacity',
    'pricing',
    'menu',
    'contingency',
  ]

  const relevantCommitments = commitments.filter((c: Commitment) => eventDomains.includes(c.domain))

  const items: ContractAddendumItem[] = relevantCommitments.map((c: Commitment) => {
    const rule = c.rule as Record<string, any>
    return {
      domain: c.domain,
      domainLabel: DOMAIN_LABELS[c.domain],
      promise: getPublicDescription(rule.type),
      streak: c.currentStreak,
    }
  })

  return {
    tenantId,
    eventId,
    items,
    generatedAt: new Date(),
  }
}

export async function generatePostEventReport(
  tenantId: string,
  eventId: string
): Promise<PostEventReport> {
  const client = createServerClient()

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const commitments = (commitmentRows || []).map(mapCommitmentRow)

  const { data: overrideRows } = await client
    .from('commitment_overrides' as any)
    .select('commitment_id, reason')
    .eq('tenant_id', tenantId)

  const overriddenIds = new Set(
    (overrideRows || []).map((o: any) => o.commitment_id as string)
  )

  const eventDomains: CommitmentDomain[] = [
    'quality',
    'dietary',
    'communication',
    'capacity',
    'pricing',
    'menu',
    'contingency',
    'closeout',
  ]

  const relevant = commitments.filter((c: Commitment) => eventDomains.includes(c.domain))

  const items: PostEventCommitmentItem[] = relevant.map((c: Commitment) => {
    const rule = c.rule as Record<string, any>
    const honored = !overriddenIds.has(c.id)
    return {
      domain: c.domain,
      domainLabel: DOMAIN_LABELS[c.domain],
      promise: getPublicDescription(rule.type),
      honored,
      detail: honored
        ? 'Maintained throughout this event (' + c.currentStreak + '-day streak)'
        : 'Adjusted for this event based on circumstances',
    }
  })

  const honoredCount = items.filter((i: PostEventCommitmentItem) => i.honored).length

  return {
    tenantId,
    eventId,
    items,
    honoredCount,
    totalCount: items.length,
    integrityPercent: items.length > 0 ? Math.round((honoredCount / items.length) * 100) : 100,
    generatedAt: new Date(),
  }
}