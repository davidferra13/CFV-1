import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces active (not finalized) shopping lists for upcoming events.
 * Tables: shopping_lists, events
 */
export async function resolveShoppingLists(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    name: string
    eventId: string | null
    eventDate: string | null
    occasion: string | null
    clientName: string | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        sl.id,
        sl.name,
        sl.event_id as "eventId",
        e.event_date as "eventDate",
        e.occasion,
        c.full_name as "clientName"
      FROM shopping_lists sl
      LEFT JOIN events e ON e.id = sl.event_id
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE sl.chef_id = ${ctx.tenantId}
        AND sl.status = 'active'
        AND sl.completed_at IS NULL
        AND (
          sl.event_id IS NULL
          OR (e.event_date IS NOT NULL AND e.event_date >= CURRENT_DATE AND e.event_date <= (CURRENT_DATE + INTERVAL '5 days')::date)
        )
      ORDER BY e.event_date ASC NULLS LAST
      LIMIT 10
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[shopping-list-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    let tier: RailTier = 'p3'

    if (row.eventDate) {
      const eventMs = new Date(row.eventDate + 'T00:00:00').getTime()
      const nowStart = new Date(
        ctx.now.getFullYear(),
        ctx.now.getMonth(),
        ctx.now.getDate()
      ).getTime()
      const daysUntil = Math.round((eventMs - nowStart) / MS_DAY)

      if (daysUntil <= 1) tier = 'p0'
      else if (daysUntil <= 2) tier = 'p1'
      else if (daysUntil <= 5) tier = 'p2'
    }

    const eventLabel = row.occasion ?? row.clientName ?? ''
    const label = eventLabel ? `Shopping: ${eventLabel}` : `Shopping: ${row.name}`

    items.push({
      definitionId: `chef.shopping_list_active.${row.id}`,
      tier,
      label,
      context: row.eventDate ? `Event ${row.eventDate}, list not finalized` : 'List not completed',
      destination: row.eventId ? `/chef/events/${row.eventId}/shopping` : '/chef/shopping',
      icon: 'shopping-cart',
      loopState: 'active',
      sourceKind: 'event',
      evidenceLabel: 'confirmed',
      confidence: 1,
      nextAction: 'Complete shopping list',
      data: {
        shoppingListId: row.id,
        eventId: row.eventId,
      },
    })
  }

  return items
}
