import { createServerClient } from '@/lib/db/server'
import type { CommitmentDomain, FrictionTier } from './types'

// Event-Specific Contracts (#28)
// Pre-acceptance quality standards per event.
// Auto-tier by event value/complexity.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export interface EventContract {
  id: string
  tenantId: string
  eventId: string
  tier: EventContractTier
  commitmentIds: string[]
  adherenceScore: number | null // 0-100, null until scored
  createdAt: Date
  scoredAt: Date | null
}

export type EventContractTier = 'standard' | 'premium' | 'signature'

export interface ContractAdherenceResult {
  contractId: string
  eventId: string
  score: number // 0-100
  totalCommitments: number
  honored: number
  overridden: number
  details: ContractAdherenceDetail[]
}

export interface ContractAdherenceDetail {
  commitmentId: string
  domain: CommitmentDomain
  honored: boolean
  overrideReason: string | null
}

// Auto-tier thresholds
const TIER_THRESHOLDS = {
  signature: { minValue: 5000, minGuests: 30 },
  premium: { minValue: 2000, minGuests: 15 },
  standard: { minValue: 0, minGuests: 0 },
}

/**
 * Create an event contract with auto-tiered quality standards.
 */
export async function createEventContract(
  tenantId: string,
  eventId: string,
  options?: { tier?: EventContractTier; eventValue?: number; guestCount?: number }
): Promise<EventContract> {
  const client = createServerClient()

  // Auto-determine tier if not specified
  let tier: EventContractTier = options?.tier ?? 'standard'
  if (!options?.tier) {
    const value = options?.eventValue ?? 0
    const guests = options?.guestCount ?? 0
    if (
      value >= TIER_THRESHOLDS.signature.minValue ||
      guests >= TIER_THRESHOLDS.signature.minGuests
    ) {
      tier = 'signature'
    } else if (
      value >= TIER_THRESHOLDS.premium.minValue ||
      guests >= TIER_THRESHOLDS.premium.minGuests
    ) {
      tier = 'premium'
    }
  }

  // Find active commitments for this tenant
  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const commitmentIds = (commitmentRows ?? []).map((r: any) => r.id as string)

  const contract: EventContract = {
    id: generateId(),
    tenantId,
    eventId,
    tier,
    commitmentIds,
    adherenceScore: null,
    createdAt: new Date(),
    scoredAt: null,
  }

  await client.from('event_contracts' as any).insert({
    id: contract.id,
    tenant_id: tenantId,
    event_id: eventId,
    tier,
    commitment_ids: commitmentIds,
    adherence_score: null,
    created_at: contract.createdAt.toISOString(),
    scored_at: null,
  } as any)

  return contract
}

/**
 * Get an event contract by event ID.
 */
export async function getEventContract(
  tenantId: string,
  eventId: string
): Promise<EventContract | null> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('event_contracts' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!rows || rows.length === 0) return null

  const row = rows[0] as any
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    eventId: row.event_id as string,
    tier: row.tier as EventContractTier,
    commitmentIds: (row.commitment_ids as string[]) ?? [],
    adherenceScore: row.adherence_score as number | null,
    createdAt: new Date(row.created_at as string),
    scoredAt: row.scored_at ? new Date(row.scored_at as string) : null,
  }
}

/**
 * Score contract adherence: how many commitments were honored vs overridden.
 */
export async function scoreContractAdherence(
  tenantId: string,
  eventId: string
): Promise<ContractAdherenceResult | null> {
  const contract = await getEventContract(tenantId, eventId)
  if (!contract) return null

  const client = createServerClient()
  const details: ContractAdherenceDetail[] = []

  // For each commitment in the contract, check if it was overridden during this event
  for (const commitmentId of contract.commitmentIds) {
    const { data: commitmentRows } = await client
      .from('commitments' as any)
      .select('id, domain')
      .eq('id', commitmentId)
      .eq('tenant_id', tenantId)
      .limit(1)

    const commitment = commitmentRows?.[0] as any
    if (!commitment) continue

    // Check for overrides linked to this event
    const { data: overrideRows } = await client
      .from('commitment_overrides' as any)
      .select('id, reason, context')
      .eq('commitment_id', commitmentId)
      .eq('tenant_id', tenantId)

    // Filter overrides that reference this event in context
    const eventOverrides = (overrideRows ?? []).filter((o: any) => {
      const ctx = o.context as Record<string, unknown> | null
      return ctx?.eventId === eventId
    })

    const overridden = eventOverrides.length > 0

    details.push({
      commitmentId,
      domain: commitment.domain as CommitmentDomain,
      honored: !overridden,
      overrideReason: overridden ? ((eventOverrides[0] as any).reason as string) : null,
    })
  }

  const honored = details.filter((d) => d.honored).length
  const overridden = details.filter((d) => !d.honored).length
  const total = details.length
  const score = total > 0 ? Math.round((honored / total) * 100) : 100

  // Persist the score
  await client
    .from('event_contracts' as any)
    .update({
      adherence_score: score,
      scored_at: new Date().toISOString(),
    } as any)
    .eq('id', contract.id)

  return {
    contractId: contract.id,
    eventId,
    score,
    totalCommitments: total,
    honored,
    overridden,
    details,
  }
}

/**
 * Get running integrity average across all scored contracts.
 */
export async function getRunningIntegrityAverage(
  tenantId: string,
  limit: number = 20
): Promise<{
  average: number
  contractCount: number
  trend: 'improving' | 'stable' | 'declining'
  scores: number[]
}> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('event_contracts' as any)
    .select('adherence_score, scored_at')
    .eq('tenant_id', tenantId)
    .not('adherence_score', 'is', null)
    .order('scored_at', { ascending: false })
    .limit(limit)

  const scores = (rows ?? [])
    .map((r: any) => r.adherence_score as number)
    .filter((s: number | null): s is number => s != null)

  if (scores.length === 0) {
    return { average: 100, contractCount: 0, trend: 'stable', scores: [] }
  }

  const average = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)

  // Trend: compare first half vs second half
  let trend: 'improving' | 'stable' | 'declining' = 'stable'
  if (scores.length >= 4) {
    const mid = Math.floor(scores.length / 2)
    // Scores are newest-first, so "recent" is the first half
    const recentAvg = scores.slice(0, mid).reduce((a: number, b: number) => a + b, 0) / mid
    const olderAvg =
      scores.slice(mid).reduce((a: number, b: number) => a + b, 0) / (scores.length - mid)
    const diff = recentAvg - olderAvg
    if (diff > 5) trend = 'improving'
    else if (diff < -5) trend = 'declining'
  }

  return { average, contractCount: scores.length, trend, scores }
}
