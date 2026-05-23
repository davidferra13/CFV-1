import { createServerClient } from '@/lib/db/server'
import type { Commitment, CommitmentDomain } from '@/lib/commitment/types'
import { DOMAIN_LABELS, DOMAIN_SEVERITY_ORDER } from '@/lib/commitment/types'

// Commitment Negotiation (#34)
// When two commitments conflict: detect, propose resolution, record, learn.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function mapCommitmentRow(row: any): Commitment {
  return {
    id: row.id, tenantId: row.tenant_id, domain: row.domain, source: row.source,
    rule: typeof row.rule === 'string' ? JSON.parse(row.rule) : row.rule,
    status: row.status, frictionLevel: row.friction_level, overrideCount: row.override_count,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at) : null,
    currentStreak: row.current_streak, longestStreak: row.longest_streak,
    futureSelfletter: row.future_self_letter, seasonalProfile: row.seasonal_profile,
    createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
  }
}

export type ConflictType = 'capacity-vs-loyalty' | 'pricing-vs-growth' | 'quality-vs-speed' | 'schedule-vs-revenue' | 'dietary-vs-menu' | 'rest-vs-demand' | 'custom'

export interface CommitmentConflict {
  id: string
  tenantId: string
  type: ConflictType
  commitmentA: Commitment
  commitmentB: Commitment
  description: string
  proposedAction: string
  detectedAt: Date
}

export interface ResolutionOption {
  id: string
  label: string
  description: string
  favoredCommitmentId: string
  tradeoff: string
}

export interface ConflictResolution {
  id: string
  tenantId: string
  conflictId: string
  chosenOptionId: string
  favoredDomain: CommitmentDomain
  sacrificedDomain: CommitmentDomain
  notes: string | null
  createdAt: Date
}

interface ConflictRule {
  type: ConflictType
  domainA: CommitmentDomain
  ruleTypeA: string
  domainB: CommitmentDomain
  ruleTypeB: string
  description: string
  check: (a: Commitment, b: Commitment, context: Record<string, any>) => boolean
}

const CONFLICT_RULES: ConflictRule[] = [
  {
    type: 'capacity-vs-loyalty', domainA: 'capacity', ruleTypeA: 'max_guests_without_sous',
    domainB: 'communication', ruleTypeB: 'response_time_sla',
    description: 'Guest capacity limit conflicts with commitment to respond to all client requests promptly.',
    check: (_a, _b, ctx) => (ctx.guestCount ?? 0) > 0,
  },
  {
    type: 'pricing-vs-growth', domainA: 'pricing', ruleTypeA: 'pricing_floor',
    domainB: 'business_health', ruleTypeB: 'quarterly_rate_review',
    description: 'Price floor may block new client acquisition during growth periods.',
    check: (_a, _b, ctx) => ctx.isNewClient === true,
  },
  {
    type: 'quality-vs-speed', domainA: 'quality', ruleTypeA: 'recipe_tested_before_serve',
    domainB: 'scheduling', ruleTypeB: 'max_events_per_week',
    description: 'Recipe testing requirement conflicts with tight event schedule.',
    check: (_a, _b, ctx) => (ctx.daysUntilEvent ?? 30) < 3 && ctx.hasUntestedRecipes === true,
  },
  {
    type: 'schedule-vs-revenue', domainA: 'scheduling', ruleTypeA: 'min_rest_days',
    domainB: 'pricing', ruleTypeB: 'say_no_min_event_value',
    description: 'Rest day commitment conflicts with a high-value event opportunity.',
    check: (_a, _b, ctx) => ctx.isHighValueEvent === true && ctx.wouldViolateRestDays === true,
  },
  {
    type: 'dietary-vs-menu', domainA: 'dietary', ruleTypeA: 'allergens_verified_before_confirm',
    domainB: 'menu', ruleTypeB: 'menu_lock_cooldown',
    description: 'Last-minute allergen discovery requires menu change, but menu is locked.',
    check: (_a, _b, ctx) => ctx.menuLocked === true && ctx.newAllergenDiscovered === true,
  },
  {
    type: 'rest-vs-demand', domainA: 'scheduling', ruleTypeA: 'max_consecutive_work_days',
    domainB: 'capacity', ruleTypeB: 'revenue_concentration_cap',
    description: 'Consecutive work day limit conflicts with peak-season demand.',
    check: (_a, _b, ctx) => (ctx.consecutiveWorkDays ?? 0) >= 4 && ctx.isPeakSeason === true,
  },
]

/**
 * Detect conflicts between active commitments given a proposed action context.
 */
export async function detectConflicts(tenantId: string, proposedAction: Record<string, any>): Promise<CommitmentConflict[]> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const commitments = ((rows ?? []) as any[]).map(mapCommitmentRow)
  const conflicts: CommitmentConflict[] = []

  const byDomainRule = new Map<string, Commitment>()
  for (const c of commitments) {
    const key = c.domain + ':' + (c.rule as Record<string, any>).type
    byDomainRule.set(key, c)
  }

  for (const rule of CONFLICT_RULES) {
    const keyA = rule.domainA + ':' + rule.ruleTypeA
    const keyB = rule.domainB + ':' + rule.ruleTypeB
    const commitmentA = byDomainRule.get(keyA)
    const commitmentB = byDomainRule.get(keyB)
    if (!commitmentA || !commitmentB) continue
    if (!rule.check(commitmentA, commitmentB, proposedAction)) continue

    conflicts.push({
      id: generateId(), tenantId, type: rule.type, commitmentA, commitmentB,
      description: rule.description, proposedAction: JSON.stringify(proposedAction), detectedAt: new Date(),
    })
  }

  return conflicts
}

/**
 * Get resolution options for a detected conflict.
 */
export function getResolutionOptions(conflict: CommitmentConflict): ResolutionOption[] {
  const labelA = DOMAIN_LABELS[conflict.commitmentA.domain] ?? conflict.commitmentA.domain
  const labelB = DOMAIN_LABELS[conflict.commitmentB.domain] ?? conflict.commitmentB.domain

  return [
    {
      id: conflict.id + '_favor_a', label: 'Prioritize ' + labelA,
      description: 'Honor your ' + labelA + ' commitment and override ' + labelB + ' this time.',
      favoredCommitmentId: conflict.commitmentA.id, tradeoff: 'Your ' + labelB + ' streak will reset.',
    },
    {
      id: conflict.id + '_favor_b', label: 'Prioritize ' + labelB,
      description: 'Honor your ' + labelB + ' commitment and override ' + labelA + ' this time.',
      favoredCommitmentId: conflict.commitmentB.id, tradeoff: 'Your ' + labelA + ' streak will reset.',
    },
    {
      id: conflict.id + '_compromise', label: 'Find a middle ground',
      description: 'Adjust both commitments temporarily. Neither streak resets, but both get a reduced standard for this event.',
      favoredCommitmentId: '', tradeoff: 'Both commitments are partially honored. May feel like neither was fully respected.',
    },
    {
      id: conflict.id + '_defer', label: 'Defer the decision',
      description: 'Postpone the action that caused the conflict. Revisit when you have more information.',
      favoredCommitmentId: '', tradeoff: 'The opportunity or obligation may pass.',
    },
  ]
}

/**
 * Record a resolution decision for a conflict.
 */
export async function recordResolution(
  tenantId: string, conflictId: string, chosenOptionId: string,
  favoredDomain: CommitmentDomain, sacrificedDomain: CommitmentDomain, notes?: string
): Promise<ConflictResolution> {
  const client = createServerClient()
  const id = generateId()
  const now = new Date()

  await client.from('commitment_conflict_resolutions' as any).insert({
    id, tenant_id: tenantId, conflict_id: conflictId, chosen_option_id: chosenOptionId,
    favored_domain: favoredDomain, sacrificed_domain: sacrificedDomain,
    notes: notes ?? null, created_at: now.toISOString(),
  })

  return { id, tenantId, conflictId, chosenOptionId, favoredDomain, sacrificedDomain, notes: notes ?? null, createdAt: now }
}

/**
 * Get conflict resolution history to learn the chef's priority hierarchy.
 */
export async function getConflictHistory(tenantId: string): Promise<{
  resolutions: ConflictResolution[]
  priorityHierarchy: { domain: CommitmentDomain; label: string; favoredCount: number; sacrificedCount: number }[]
}> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitment_conflict_resolutions' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const resolutions: ConflictResolution[] = ((rows ?? []) as any[]).map((r) => ({
    id: r.id as string, tenantId: r.tenant_id as string, conflictId: r.conflict_id as string,
    chosenOptionId: r.chosen_option_id as string, favoredDomain: r.favored_domain as CommitmentDomain,
    sacrificedDomain: r.sacrificed_domain as CommitmentDomain,
    notes: r.notes as string | null, createdAt: new Date(r.created_at as string),
  }))

  const favoredCounts = new Map<CommitmentDomain, number>()
  const sacrificedCounts = new Map<CommitmentDomain, number>()

  for (const r of resolutions) {
    if (r.favoredDomain) favoredCounts.set(r.favoredDomain, (favoredCounts.get(r.favoredDomain) ?? 0) + 1)
    if (r.sacrificedDomain) sacrificedCounts.set(r.sacrificedDomain, (sacrificedCounts.get(r.sacrificedDomain) ?? 0) + 1)
  }

  const allDomains = new Set([...favoredCounts.keys(), ...sacrificedCounts.keys()])
  const priorityHierarchy = [...allDomains]
    .map((domain) => ({
      domain, label: DOMAIN_LABELS[domain] ?? domain,
      favoredCount: favoredCounts.get(domain) ?? 0, sacrificedCount: sacrificedCounts.get(domain) ?? 0,
    }))
    .sort((a, b) => (b.favoredCount - b.sacrificedCount) - (a.favoredCount - a.sacrificedCount))

  return { resolutions, priorityHierarchy }
}
