import type { GodModeResolvedItem, GodModeResolverContext } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces pending review/testimonial requests.
 * Tables: testimonials (requestSentAt, submittedAt)
 */
export async function resolveReviewRequests(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    clientName: string
    requestSentAt: string
    eventId: string | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        t.id,
        t.client_name as "clientName",
        t.request_sent_at as "requestSentAt",
        t.event_id as "eventId"
      FROM testimonials t
      WHERE t.tenant_id = ${ctx.tenantId}
        AND t.request_sent_at IS NOT NULL
        AND t.submitted_at IS NULL
        AND t.request_sent_at > (NOW() - INTERVAL '60 days')
      ORDER BY t.request_sent_at DESC
      LIMIT 10
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[review-request-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const sentMs = new Date(row.requestSentAt).getTime()
    const daysSince = Math.round((ctx.now.getTime() - sentMs) / MS_DAY)

    items.push({
      definitionId: `chef.review_pending.${row.id}`,
      tier: 'p4',
      label: `Review pending: ${row.clientName}`,
      context: `Request sent ${daysSince}d ago, no response yet`,
      destination: row.eventId ? `/chef/events/${row.eventId}` : '/chef/reviews',
      icon: 'star',
      loopState: 'waiting',
      sourceKind: 'client_profile',
      evidenceLabel: 'confirmed',
      confidence: 1,
      nextAction: daysSince >= 14 ? 'Send a gentle reminder' : 'Awaiting review submission',
      waitingOn: {
        kind: 'reply',
        label: 'Client review',
        followUpAt: null,
      },
      data: {
        testimonialId: row.id,
        eventId: row.eventId,
        daysSinceSent: daysSince,
      },
    })
  }

  return items
}
