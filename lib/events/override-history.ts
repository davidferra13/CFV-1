'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { ReadinessGate } from './readiness'
import type { CommitmentDomain } from '@/lib/commitment/types'

/**
 * Count how many times a specific gate has been overridden
 * for the current tenant in the last 90 days.
 */
export async function getOverrideCountLast90Days(gate: ReadinessGate): Promise<number> {
  const user = await requireChef()
  const db: any = createServerClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { count, error } = await db
    .from('event_readiness_gates')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('gate', gate)
    .eq('status', 'overridden')
    .gte('resolved_at', ninetyDaysAgo.toISOString())

  if (error) {
    console.error('[getOverrideCountLast90Days] Error:', error)
    return 0
  }

  return count ?? 0
}

export async function getActiveCommitmentForDomain(
  domain: CommitmentDomain
): Promise<{ description: string; domain: CommitmentDomain } | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('commitments')
    .select('description, domain')
    .eq('tenant_id', user.tenantId!)
    .eq('domain', domain)
    .eq('status', 'active')
    .limit(1)

  if (error || !data?.length) return null
  return { description: data[0].description, domain: data[0].domain }
}
