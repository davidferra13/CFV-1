import { createServerClient } from '@/lib/db/server'
import type { FrictionTier } from './types'

// #44 Anti-Scope-Creep Lock
// Post-proposal scope soft-lock. Prevents "oh and also."
// Minor = Tier 1 friction, medium = Tier 2 + re-pricing prompt,
// major = Tier 3 mandatory re-proposal.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export type ScopeChangeType = 'minor' | 'medium' | 'major'

export interface ScopeChangeCheck {
  eventId: string
  changeType: ScopeChangeType
  frictionTier: FrictionTier
  requiresRepricing: boolean
  requiresReproposal: boolean
  message: string
  estimatedMarginImpact: number | null
  changeCount: number
  previousChanges: ScopeChangeEntry[]
}

export interface ScopeChangeEntry {
  id: string
  tenantId: string
  eventId: string
  changeType: ScopeChangeType
  description: string
  frictionTierApplied: FrictionTier
  repricingTriggered: boolean
  marginImpactPercent: number | null
  createdAt: Date
}

export interface MarginImpactReport {
  eventId: string
  originalMargin: number | null
  currentMargin: number | null
  changeCount: number
  cumulativeImpact: number
  warning: string | null
}

const SCOPE_FRICTION: Record<ScopeChangeType, { tier: FrictionTier; repricing: boolean; reproposal: boolean }> = {
  minor: { tier: 1, repricing: false, reproposal: false },
  medium: { tier: 2, repricing: true, reproposal: false },
  major: { tier: 3, repricing: true, reproposal: true },
}

const SCOPE_MESSAGES: Record<ScopeChangeType, string> = {
  minor: 'Small scope change noted. Your pricing holds, but this adds to cumulative drift.',
  medium: 'Medium scope change. This affects your margins. Review pricing before confirming.',
  major: 'Major scope change. This requires a new proposal. The original quote no longer covers this event.',
}

function escalateByHistory(
  baseType: ScopeChangeType,
  previousCount: number
): ScopeChangeType {
  if (baseType === 'minor' && previousCount >= 3) return 'medium'
  if (baseType === 'medium' && previousCount >= 2) return 'major'
  return baseType
}

export async function checkScopeChange(
  tenantId: string,
  eventId: string,
  changeType: ScopeChangeType
): Promise<ScopeChangeCheck> {
  const client = createServerClient()

  const { data: historyRows } = await client
    .from('commitment_scope_changes' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  const previousChanges: ScopeChangeEntry[] = (historyRows || []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    changeType: row.change_type,
    description: row.description || '',
    frictionTierApplied: row.friction_tier_applied,
    repricingTriggered: row.repricing_triggered,
    marginImpactPercent: row.margin_impact_percent,
    createdAt: new Date(row.created_at),
  }))

  const sameTypeCount = previousChanges.filter((c: ScopeChangeEntry) => c.changeType === changeType).length
  const effectiveType = escalateByHistory(changeType, sameTypeCount)
  const friction = SCOPE_FRICTION[effectiveType]

  let estimatedMarginImpact: number | null = null
  const cumImpact = previousChanges.reduce(
    (sum: number, c: ScopeChangeEntry) => sum + (c.marginImpactPercent ?? 0),
    0
  )
  if (cumImpact !== 0) {
    estimatedMarginImpact = cumImpact
  }

  let message = SCOPE_MESSAGES[effectiveType]
  if (effectiveType !== changeType) {
    message = 'Escalated from ' + changeType + ' to ' + effectiveType + ' due to ' + sameTypeCount + ' previous ' + changeType + ' changes. ' + message
  }

  return {
    eventId,
    changeType: effectiveType,
    frictionTier: friction.tier,
    requiresRepricing: friction.repricing,
    requiresReproposal: friction.reproposal,
    message,
    estimatedMarginImpact,
    changeCount: previousChanges.length,
    previousChanges,
  }
}

export async function getScopeChangeHistory(
  tenantId: string,
  eventId: string
): Promise<ScopeChangeEntry[]> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitment_scope_changes' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  return (rows || []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    changeType: row.change_type,
    description: row.description || '',
    frictionTierApplied: row.friction_tier_applied,
    repricingTriggered: row.repricing_triggered,
    marginImpactPercent: row.margin_impact_percent,
    createdAt: new Date(row.created_at),
  }))
}

export async function calculateMarginImpact(
  tenantId: string,
  eventId: string
): Promise<MarginImpactReport> {
  const client = createServerClient()

  const history = await getScopeChangeHistory(tenantId, eventId)

  const { data: quoteRows } = await client
    .from('quotes' as any)
    .select('per_head_price, food_cost, total_price')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(2)

  let originalMargin: number | null = null
  let currentMargin: number | null = null

  if (quoteRows && quoteRows.length > 0) {
    const firstQuote = quoteRows[0] as any
    const latestQuote = quoteRows[quoteRows.length - 1] as any

    const origTotal = Number(firstQuote.total_price) || 0
    const origCost = Number(firstQuote.food_cost) || 0
    if (origTotal > 0) {
      originalMargin = Math.round(((origTotal - origCost) / origTotal) * 100)
    }

    const currTotal = Number(latestQuote.total_price) || 0
    const currCost = Number(latestQuote.food_cost) || 0
    if (currTotal > 0) {
      currentMargin = Math.round(((currTotal - currCost) / currTotal) * 100)
    }
  }

  const cumulativeImpact = history.reduce(
    (sum: number, c: ScopeChangeEntry) => sum + (c.marginImpactPercent ?? 0),
    0
  )

  let warning: string | null = null
  if (cumulativeImpact < -15) {
    warning = 'Scope changes have reduced margins by ' + Math.abs(cumulativeImpact) + '%. Consider re-quoting.'
  } else if (history.length >= 4) {
    warning = history.length + ' scope changes on this event. Pattern suggests initial scoping may need improvement.'
  }

  return {
    eventId,
    originalMargin,
    currentMargin,
    changeCount: history.length,
    cumulativeImpact,
    warning,
  }
}