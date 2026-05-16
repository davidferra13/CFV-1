import type { GodModeResolvedItem, GodModeResolverContext } from '../../god-mode-types'

const MS_DAY = 86_400_000
const DORMANT_THRESHOLD_DAYS = 60

/**
 * Surfaces clients with no contact in X weeks.
 * Tables: clients (lastEventDate, updatedAt)
 */
export async function resolveDormantClients(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    fullName: string
    lastEventDate: string | null
    totalEventsCompleted: number
    lifetimeValueCents: number
    updatedAt: string
  }[]

  try {
    const result = await pgClient`
      SELECT
        c.id,
        c.full_name as "fullName",
        c.last_event_date as "lastEventDate",
        c.total_events_completed as "totalEventsCompleted",
        c.lifetime_value_cents as "lifetimeValueCents",
        c.updated_at as "updatedAt"
      FROM clients c
      WHERE c.tenant_id = ${ctx.tenantId}
        AND c.status = 'active'
        AND c.total_events_completed > 0
        AND c.last_event_date IS NOT NULL
        AND c.last_event_date < (CURRENT_DATE - ${DORMANT_THRESHOLD_DAYS} * INTERVAL '1 day')::date
      ORDER BY c.lifetime_value_cents DESC
      LIMIT 10
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[dormant-client-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    if (!row.lastEventDate) continue

    const lastMs = new Date(row.lastEventDate + 'T00:00:00').getTime()
    const nowStart = new Date(
      ctx.now.getFullYear(),
      ctx.now.getMonth(),
      ctx.now.getDate()
    ).getTime()
    const daysSince = Math.round((nowStart - lastMs) / MS_DAY)

    const ltv = `$${(row.lifetimeValueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`

    items.push({
      definitionId: `chef.dormant_client.${row.id}`,
      tier: 'p4',
      label: `Reconnect: ${row.fullName}`,
      context: `${daysSince}d since last event, ${row.totalEventsCompleted} events, ${ltv} LTV`,
      destination: `/chef/clients/${row.id}`,
      icon: 'user-clock',
      loopState: 'stale',
      sourceKind: 'client_profile',
      evidenceLabel: 'computed',
      confidence: 0.7,
      nextAction: 'Send a check-in or availability update',
      data: {
        clientId: row.id,
        daysSinceLastEvent: daysSince,
        totalEvents: row.totalEventsCompleted,
        lifetimeValueCents: row.lifetimeValueCents,
      },
    })
  }

  return items
}
