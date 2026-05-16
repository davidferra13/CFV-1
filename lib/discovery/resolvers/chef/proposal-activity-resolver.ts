import type { GodModeResolvedItem, GodModeResolverContext } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces client portal activity: recently viewed proposals/quotes.
 * Tables: proposal_tokens (viewCount, lastViewedAt, firstViewedAt)
 */
export async function resolveProposalActivity(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    quoteId: string
    eventId: string | null
    clientName: string | null
    viewCount: number
    lastViewedAt: string
    firstViewedAt: string | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        pt.id,
        pt.quote_id as "quoteId",
        pt.event_id as "eventId",
        c.full_name as "clientName",
        pt.view_count as "viewCount",
        pt.last_viewed_at as "lastViewedAt",
        pt.first_viewed_at as "firstViewedAt"
      FROM proposal_tokens pt
      JOIN clients c ON c.id = pt.client_id
      WHERE pt.tenant_id = ${ctx.tenantId}
        AND pt.revoked_at IS NULL
        AND pt.last_viewed_at IS NOT NULL
        AND pt.last_viewed_at > (NOW() - INTERVAL '3 days')
      ORDER BY pt.last_viewed_at DESC
      LIMIT 10
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[proposal-activity-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const lastViewMs = new Date(row.lastViewedAt).getTime()
    const hoursAgo = Math.round((ctx.now.getTime() - lastViewMs) / (1000 * 60 * 60))

    items.push({
      definitionId: `chef.proposal_viewed.${row.id}`,
      tier: hoursAgo <= 6 ? ('p2' as const) : ('p3' as const),
      label: `${row.clientName ?? 'Client'} viewed your proposal`,
      context:
        hoursAgo <= 1
          ? 'Just now'
          : hoursAgo < 24
            ? `${hoursAgo}h ago`
            : `${Math.round(hoursAgo / 24)}d ago, ${row.viewCount} views total`,
      destination: row.eventId
        ? `/chef/events/${row.eventId}/quote`
        : `/chef/quotes/${row.quoteId}`,
      icon: 'eye',
      loopState: 'active',
      sourceKind: 'quote',
      evidenceLabel: 'confirmed',
      confidence: 1,
      nextAction: 'Follow up while interest is warm',
      data: {
        proposalTokenId: row.id,
        quoteId: row.quoteId,
        eventId: row.eventId,
        viewCount: row.viewCount,
        hoursAgo,
      },
    })
  }

  return items
}
