import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

// 10-stage lifecycle labels (stages 1-10 from service-lifecycle-blueprint)
const STAGE_LABELS: Record<number, string> = {
  1: 'Inquiry received',
  2: 'First response sent',
  3: 'Quote pending',
  4: 'Contract pending',
  5: 'Deposit due',
  6: 'Pre-event planning',
  7: 'Final prep',
  8: 'Event day',
  9: 'Post-event follow-up',
  10: 'Client retention',
}

const STAGE_CONTEXT: Record<number, string> = {
  1: 'New inquiry needs triage',
  2: 'Awaiting client reply after first outreach',
  3: 'Quote sent, waiting for acceptance',
  4: 'Contract needs signature',
  5: 'Waiting on deposit payment',
  6: 'Menu, logistics, and prep planning',
  7: 'Final details and shopping',
  8: 'Service day operations',
  9: 'Invoice, feedback, and thank-you',
  10: 'Re-engagement and referral',
}

const STAGE_TIER: Record<number, RailTier> = {
  1: 'p1',
  2: 'p2',
  3: 'p2',
  4: 'p2',
  5: 'p1',
  6: 'p3',
  7: 'p1',
  8: 'p0',
  9: 'p2',
  10: 'p3',
}

const STAGE_SCORE: Record<number, number> = {
  1: 80,
  2: 50,
  3: 55,
  4: 60,
  5: 75,
  6: 40,
  7: 70,
  8: 95,
  9: 45,
  10: 25,
}

const MAX_ITEMS = 5

export async function resolveLifecycleStages(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  try {
    const { buildTriggerContext } = await import('@/lib/lifecycle/trigger-engine')
    const { pgClient } = await import('@/lib/db/index')

    // Fetch active events for this tenant
    const events = await pgClient<
      { id: string; inquiry_id: string | null; occasion: string | null; event_date: string | null }[]
    >`
      SELECT e.id, e.inquiry_id, e.occasion, e.event_date
      FROM events e
      WHERE e.tenant_id = ${ctx.tenantId}
        AND e.status NOT IN ('completed', 'cancelled', 'archived')
        AND e.deleted_at IS NULL
      ORDER BY e.event_date ASC NULLS LAST
      LIMIT 10
    `

    const items: GodModeResolvedItem[] = []

    for (const event of events) {
      try {
        const triggerCtx = await buildTriggerContext(
          ctx.tenantId,
          event.inquiry_id,
          event.id
        )

        const stage = triggerCtx.lifecycleStage
        const label = STAGE_LABELS[stage] ?? `Stage ${stage}`
        const eventLabel = event.occasion ?? 'Event'

        items.push({
          definitionId: `lifecycle-stage-${event.id}`,
          tier: STAGE_TIER[stage] ?? 'p3',
          label: `${eventLabel}: ${label}`,
          context: STAGE_CONTEXT[stage] ?? '',
          destination: event.inquiry_id
            ? `/inquiries/${event.inquiry_id}`
            : `/chef/events/${event.id}`,
          icon: 'milestone',
          score: STAGE_SCORE[stage] ?? 30,
          sourceKind: 'event',
          evidenceLabel: 'computed',
          confidence: 0.9,
          nextAction: getNextAction(stage),
          data: {
            eventId: event.id,
            inquiryId: event.inquiry_id,
            lifecycleStage: stage,
            eventDate: event.event_date,
          },
        })
      } catch {
        // Skip individual event failures
      }
    }

    // Sort by score descending, cap at MAX_ITEMS
    items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    return items.slice(0, MAX_ITEMS)
  } catch (err) {
    console.error('[lifecycle-stage-resolver] Failed:', err)
    return []
  }
}

function getNextAction(stage: number): string | null {
  switch (stage) {
    case 1:
      return 'Respond to inquiry'
    case 2:
      return 'Follow up if no reply'
    case 3:
      return 'Check quote status'
    case 4:
      return 'Send contract for signing'
    case 5:
      return 'Send deposit reminder'
    case 6:
      return 'Finalize menu and logistics'
    case 7:
      return 'Complete shopping and prep'
    case 8:
      return 'Run service checklist'
    case 9:
      return 'Send invoice and request feedback'
    case 10:
      return 'Schedule re-engagement'
    default:
      return null
  }
}
