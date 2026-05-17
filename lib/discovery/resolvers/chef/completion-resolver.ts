import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'
import type { CompletionResult, CompletionStatus } from '@/lib/completion/types'

const MAX_ITEMS = 4

const STATUS_TIER: Record<CompletionStatus, RailTier> = {
  incomplete: 'p2',
  partial: 'p3',
  complete: 'p4',
}

export async function resolveCompletionItems(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  try {
    const { evaluateCompletion } = await import('@/lib/completion/engine')
    const { pgClient } = await import('@/lib/db/index')

    // Fetch upcoming events (next 30 days, non-terminal)
    const events = await pgClient<
      { id: string; occasion: string | null; event_date: string | null }[]
    >`
      SELECT id, occasion, event_date
      FROM events
      WHERE tenant_id = ${ctx.tenantId}
        AND status NOT IN ('completed', 'cancelled', 'archived')
        AND event_date >= CURRENT_DATE
        AND event_date <= CURRENT_DATE + INTERVAL '30 days'
        AND deleted_at IS NULL
      ORDER BY event_date ASC
      LIMIT 8
    `

    const items: GodModeResolvedItem[] = []

    for (const event of events) {
      try {
        const result = await evaluateCompletion('event', event.id, ctx.tenantId, { shallow: true })
        if (!result || result.status === 'complete') continue

        const item = completionToRailItem(result, event, ctx)
        if (item) items.push(item)

        // Also check blocking children (recursive completeness)
        if (result.blockingRequirements.length > 0) {
          const blockingItem = buildBlockingItem(result, event, ctx)
          if (blockingItem) items.push(blockingItem)
        }
      } catch {
        // Skip individual failures
      }
    }

    // Sort: lowest score first (most incomplete = most urgent)
    items.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    return items.slice(0, MAX_ITEMS)
  } catch (err) {
    console.error('[completion-resolver] Failed:', err)
    return []
  }
}

function completionToRailItem(
  result: CompletionResult,
  event: { id: string; occasion: string | null; event_date: string | null },
  ctx: GodModeResolverContext
): GodModeResolvedItem | null {
  const label = event.occasion || 'Event'
  const daysUntil = event.event_date
    ? Math.ceil(
        (new Date(event.event_date).getTime() - ctx.now.getTime()) / 86_400_000
      )
    : null

  // Promote tier for events happening soon with low completion
  let tier = STATUS_TIER[result.status]
  if (daysUntil !== null && daysUntil <= 3 && result.score < 70) {
    tier = 'p1'
  } else if (daysUntil !== null && daysUntil <= 7 && result.score < 50) {
    tier = 'p2'
  }

  return {
    definitionId: `chef.completion_event-${event.id}`,
    tier,
    label: `${label}: ${result.score}% ready`,
    context: result.missingRequirements.length > 0
      ? `Missing: ${result.missingRequirements.slice(0, 3).map((r) => r.label).join(', ')}`
      : '',
    destination: result.nextAction?.url ?? `/chef/events/${event.id}`,
    icon: 'calendar',
    score: Math.max(10, 100 - result.score),
    sourceKind: 'event',
    evidenceLabel: 'computed',
    confidence: 0.95,
    nextAction: result.nextAction?.label ?? null,
    data: {
      eventId: event.id,
      completionScore: result.score,
      completionStatus: result.status,
      missingCount: result.missingRequirements.length,
      blockingCount: result.blockingRequirements.length,
    },
  }
}

function buildBlockingItem(
  result: CompletionResult,
  event: { id: string; occasion: string | null; event_date: string | null },
  _ctx: GodModeResolverContext
): GodModeResolvedItem | null {
  const blockers = result.blockingRequirements
  if (blockers.length === 0) return null

  const topBlocker = blockers[0]
  const label = event.occasion || 'Event'

  return {
    definitionId: `chef.completion_recursive-${event.id}`,
    tier: 'p2',
    label: `${label} blocked: ${topBlocker.label}`,
    context: blockers.length > 1
      ? `${blockers.length} blocking requirements`
      : topBlocker.label,
    destination: topBlocker.actionUrl ?? `/chef/events/${event.id}`,
    icon: 'alert-triangle',
    score: 65,
    sourceKind: 'event',
    evidenceLabel: 'computed',
    confidence: 0.95,
    nextAction: topBlocker.actionLabel ?? 'Resolve blocker',
    data: {
      eventId: event.id,
      blockingKey: topBlocker.key,
      blockingCategory: topBlocker.category,
    },
  }
}
