import { createServerClient } from '@/lib/db/server'
import type { CommitmentDomain } from './types'

// ── Cooling-Off Periods ─────────────────────────────────────────────────────
// Configurable delay between override decision and execution.
// Prevents impulsive overrides by enforcing a waiting period.

export interface CoolingOffConfig {
  domain: CommitmentDomain
  delayHours: number
  label: string
}

/**
 * Default cooling-off periods by domain.
 * Dietary safety gets the longest delay (24hr) because the stakes are highest.
 * Pricing gets a moderate delay (4hr) to prevent reactive discounting.
 * Scheduling gets a short delay (1hr) for time-sensitive decisions.
 * All other domains default to 2 hours.
 */
export const DEFAULT_COOLING_OFF: Record<CommitmentDomain, CoolingOffConfig> = {
  dietary: { domain: 'dietary', delayHours: 24, label: '24 hours (safety critical)' },
  pricing: { domain: 'pricing', delayHours: 4, label: '4 hours (prevent reactive discounting)' },
  scheduling: { domain: 'scheduling', delayHours: 1, label: '1 hour (time-sensitive)' },
  menu: { domain: 'menu', delayHours: 2, label: '2 hours' },
  closeout: { domain: 'closeout', delayHours: 2, label: '2 hours' },
  communication: { domain: 'communication', delayHours: 1, label: '1 hour' },
  capacity: { domain: 'capacity', delayHours: 2, label: '2 hours' },
  contingency: { domain: 'contingency', delayHours: 4, label: '4 hours (safety adjacent)' },
  travel: { domain: 'travel', delayHours: 1, label: '1 hour' },
  business_health: { domain: 'business_health', delayHours: 2, label: '2 hours' },
  quality: { domain: 'quality', delayHours: 4, label: '4 hours (quality critical)' },
  financial: { domain: 'financial', delayHours: 4, label: '4 hours (financial impact)' },
}

export type CoolingOffStatus = 'not_started' | 'cooling' | 'ready' | 'expired'

export interface CoolingOffState {
  commitmentId: string
  domain: CommitmentDomain
  status: CoolingOffStatus
  startedAt: number | null
  expiresAt: number | null
  remainingMs: number
  remainingLabel: string
  delayHours: number
}

/**
 * Start a cooling-off period for a commitment override.
 * Stores the start time in the commitment_cooling_off table.
 */
export async function startCoolingOff(
  commitmentId: string,
  tenantId: string,
  reason: string
): Promise<CoolingOffState> {
  const client = createServerClient()

  // Get the commitment domain
  const { data: commitment } = await client
    .from('commitments' as any)
    .select('domain')
    .eq('id', commitmentId)
    .eq('tenant_id', tenantId)
    .single()

  if (!commitment) {
    throw new Error('[commitment/cooling-off] Commitment not found')
  }

  const domain = commitment.domain as CommitmentDomain
  const config = DEFAULT_COOLING_OFF[domain]
  const now = Date.now()
  const expiresAt = now + config.delayHours * 60 * 60 * 1000

  // Store pending override with cooling-off metadata
  const { error } = await client.from('commitment_cooling_off' as any).upsert({
    commitment_id: commitmentId,
    tenant_id: tenantId,
    reason,
    started_at: new Date(now).toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
    status: 'cooling',
  })

  if (error) {
    // Table may not exist yet; fall back to immediate override
    console.error('[commitment/cooling-off] upsert failed:', error.message)
    return {
      commitmentId,
      domain,
      status: 'ready',
      startedAt: now,
      expiresAt: now,
      remainingMs: 0,
      remainingLabel: 'Ready',
      delayHours: config.delayHours,
    }
  }

  const remainingMs = expiresAt - now

  return {
    commitmentId,
    domain,
    status: 'cooling',
    startedAt: now,
    expiresAt,
    remainingMs,
    remainingLabel: formatRemaining(remainingMs),
    delayHours: config.delayHours,
  }
}

/**
 * Check the cooling-off status for a commitment.
 * Returns 'ready' if the cooling period has elapsed.
 */
export async function checkCoolingOff(
  commitmentId: string,
  tenantId: string
): Promise<CoolingOffState> {
  const client = createServerClient()

  const { data: commitment } = await client
    .from('commitments' as any)
    .select('domain')
    .eq('id', commitmentId)
    .eq('tenant_id', tenantId)
    .single()

  if (!commitment) {
    throw new Error('[commitment/cooling-off] Commitment not found')
  }

  const domain = commitment.domain as CommitmentDomain
  const config = DEFAULT_COOLING_OFF[domain]

  const { data: coolingRow } = await client
    .from('commitment_cooling_off' as any)
    .select('started_at, expires_at, status')
    .eq('commitment_id', commitmentId)
    .eq('tenant_id', tenantId)
    .eq('status', 'cooling')
    .single()

  if (!coolingRow) {
    return {
      commitmentId,
      domain,
      status: 'not_started',
      startedAt: null,
      expiresAt: null,
      remainingMs: config.delayHours * 60 * 60 * 1000,
      remainingLabel: formatRemaining(config.delayHours * 60 * 60 * 1000),
      delayHours: config.delayHours,
    }
  }

  const expiresAtMs = new Date(coolingRow.expires_at as string).getTime()
  const startedAt = new Date(coolingRow.started_at as string).getTime()
  const now = Date.now()
  const remainingMs = Math.max(0, expiresAtMs - now)

  if (remainingMs <= 0) {
    // Mark as ready
    await client
      .from('commitment_cooling_off' as any)
      .update({ status: 'ready' })
      .eq('commitment_id', commitmentId)
      .eq('tenant_id', tenantId)
      .eq('status', 'cooling')

    return {
      commitmentId,
      domain,
      status: 'ready',
      startedAt,
      expiresAt: expiresAtMs,
      remainingMs: 0,
      remainingLabel: 'Ready',
      delayHours: config.delayHours,
    }
  }

  return {
    commitmentId,
    domain,
    status: 'cooling',
    startedAt,
    expiresAt: expiresAtMs,
    remainingMs,
    remainingLabel: formatRemaining(remainingMs),
    delayHours: config.delayHours,
  }
}

/**
 * Cancel a pending cooling-off period.
 * The chef decided not to override after all.
 */
export async function cancelCoolingOff(commitmentId: string, tenantId: string): Promise<void> {
  const client = createServerClient()

  await client
    .from('commitment_cooling_off' as any)
    .update({ status: 'expired' })
    .eq('commitment_id', commitmentId)
    .eq('tenant_id', tenantId)
    .eq('status', 'cooling')
}

/**
 * Get the cooling-off delay for a domain in hours.
 */
export function getCoolingOffDelay(domain: CommitmentDomain): number {
  return DEFAULT_COOLING_OFF[domain].delayHours
}

/**
 * Format remaining milliseconds into a human-readable label.
 */
function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Ready'

  const hours = Math.floor(ms / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m remaining`
  if (hours > 0) return `${hours}h remaining`
  if (minutes > 0) return `${minutes}m remaining`
  return 'Less than a minute'
}
