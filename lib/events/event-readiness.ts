import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Lightweight readiness check for the Current Events page.
// Checks menu, contract, and deposit status for a batch of events.
// ---------------------------------------------------------------------------

export interface EventReadiness {
  eventId: string
  hasMenu: boolean
  hasContract: boolean
  hasDeposit: boolean
  readinessScore: number // 0-100
}

const POINTS_PER_ITEM = 33

/**
 * Batch-fetch readiness signals for a set of chef events.
 * Returns a Map keyed by eventId for O(1) lookup in the card grid.
 */
export async function getEventReadiness(
  tenantId: string,
  eventIds: string[]
): Promise<Map<string, EventReadiness>> {
  if (eventIds.length === 0) return new Map()

  const db: any = createServerClient()

  // Run all three lookups in parallel
  const [menuRes, contractRes, ledgerRes] = await Promise.all([
    db.from('menus').select('event_id').eq('tenant_id', tenantId).in('event_id', eventIds),
    db.from('contracts').select('event_id').eq('tenant_id', tenantId).in('event_id', eventIds),
    db
      .from('ledger_entries')
      .select('event_id')
      .eq('tenant_id', tenantId)
      .in('event_id', eventIds)
      .in('entry_type', ['deposit', 'payment']),
  ])

  const menuEventIds = new Set((menuRes.data ?? []).map((r: any) => r.event_id))
  const contractEventIds = new Set((contractRes.data ?? []).map((r: any) => r.event_id))
  const depositEventIds = new Set((ledgerRes.data ?? []).map((r: any) => r.event_id))

  const result = new Map<string, EventReadiness>()

  for (const id of eventIds) {
    const hasMenu = menuEventIds.has(id)
    const hasContract = contractEventIds.has(id)
    const hasDeposit = depositEventIds.has(id)
    const score =
      (hasMenu ? POINTS_PER_ITEM : 0) +
      (hasContract ? POINTS_PER_ITEM : 0) +
      (hasDeposit ? POINTS_PER_ITEM : 0) +
      (hasMenu && hasContract && hasDeposit ? 1 : 0)

    result.set(id, {
      eventId: id,
      hasMenu,
      hasContract,
      hasDeposit,
      readinessScore: Math.min(score, 100),
    })
  }

  return result
}
