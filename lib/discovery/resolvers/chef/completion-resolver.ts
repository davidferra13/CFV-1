import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'
import type { CompletionResult, CompletionStatus, EntityType } from '@/lib/completion/types'
import type { SourceKind } from '@/lib/operating-loop/types'

const MAX_ITEMS = 4
const MAX_ENTITY_BLOCKERS = 4

const STATUS_TIER: Record<CompletionStatus, RailTier> = {
  incomplete: 'p2',
  partial: 'p3',
  complete: 'p4',
}

const ENTITY_SOURCE_KIND: Partial<Record<EntityType, SourceKind>> = {
  event: 'event',
  client: 'client_profile',
  menu: 'menu',
  recipe: 'recipe',
}

const ENTITY_ICON: Partial<Record<EntityType, string>> = {
  event: 'calendar',
  client: 'user',
  menu: 'utensils',
  recipe: 'utensils',
}

const ENTITY_PATH_PREFIX: Partial<Record<EntityType, string>> = {
  event: '/chef/events',
  client: '/chef/clients',
  menu: '/chef/menus',
  recipe: '/chef/recipes',
}

// ---------------------------------------------------------------------------
// Entity-scoped completion (contextual rail)
// ---------------------------------------------------------------------------

async function resolveEntityCompletion(
  ctx: GodModeResolverContext,
  entityType: EntityType,
  entityId: string
): Promise<GodModeResolvedItem[]> {
  try {
    const { evaluateCompletion } = await import('@/lib/completion/engine')
    const result = await evaluateCompletion(entityType, entityId, ctx.tenantId)
    if (!result || result.status === 'complete') return []

    const items: GodModeResolvedItem[] = []
    const sourceKind = ENTITY_SOURCE_KIND[entityType] ?? 'system'
    const icon = ENTITY_ICON[entityType] ?? 'check-circle'
    const pathPrefix = ENTITY_PATH_PREFIX[entityType] ?? '/chef'
    const entityLabel = result.entityLabel ?? entityType

    // Summary item: overall completion percentage and blocking count
    const blockingCount = result.blockingRequirements.length
    const tier: RailTier = blockingCount > 0 ? 'p1' : STATUS_TIER[result.status]

    items.push({
      definitionId: `chef.entity_completion-${entityType}-${entityId}`,
      tier,
      label: `${entityLabel}: ${result.score}% ready`,
      context:
        blockingCount > 0
          ? `${blockingCount} blocking requirement${blockingCount === 1 ? '' : 's'}`
          : result.missingRequirements.length > 0
            ? `${result.missingRequirements.length} items remaining`
            : '',
      destination: result.nextAction?.url ?? `${pathPrefix}/${entityId}`,
      icon,
      score: Math.max(10, 100 - result.score),
      sourceKind,
      evidenceLabel: 'computed',
      confidence: 0.95,
      nextAction: result.nextAction?.label ?? null,
      data: {
        entityType,
        entityId,
        completionScore: result.score,
        completionStatus: result.status,
        blockingCount,
        missingCount: result.missingRequirements.length,
      },
    })

    // Individual blocking requirement items (up to MAX_ENTITY_BLOCKERS)
    for (const blocker of result.blockingRequirements.slice(0, MAX_ENTITY_BLOCKERS)) {
      items.push({
        definitionId: `chef.entity_blocker-${entityType}-${entityId}-${blocker.key}`,
        tier: 'p1',
        label: blocker.label,
        context: `Blocks ${entityLabel} (${blocker.category})`,
        destination: blocker.actionUrl ?? `${pathPrefix}/${entityId}`,
        icon: 'alert-triangle',
        score: 70,
        sourceKind,
        evidenceLabel: 'computed',
        confidence: 0.95,
        nextAction: blocker.actionLabel ?? 'Resolve',
        data: {
          entityType,
          entityId,
          blockingKey: blocker.key,
          blockingCategory: blocker.category,
        },
      })
    }

    return items
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Main resolver (existing logic, unchanged)
// ---------------------------------------------------------------------------

export async function resolveCompletionItems(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  // Entity-scoped early returns for contextual rail
  if (ctx.entityContext?.type === 'event') {
    return resolveEntityCompletion(ctx, 'event', ctx.entityContext.id)
  }
  if (ctx.entityContext?.type === 'client') {
    return resolveEntityCompletion(ctx, 'client', ctx.entityContext.id)
  }
  if (ctx.entityContext?.type === 'menu') {
    return resolveEntityCompletion(ctx, 'menu', ctx.entityContext.id)
  }
  if (ctx.entityContext?.type === 'recipe') {
    return resolveEntityCompletion(ctx, 'recipe', ctx.entityContext.id)
  }

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
    ? Math.ceil((new Date(event.event_date).getTime() - ctx.now.getTime()) / 86_400_000)
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
    context:
      result.missingRequirements.length > 0
        ? `Missing: ${result.missingRequirements
            .slice(0, 3)
            .map((r) => r.label)
            .join(', ')}`
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
    context: blockers.length > 1 ? `${blockers.length} blocking requirements` : topBlocker.label,
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
