import type { GodModeResolvedItem, GodModeResolverContext } from './god-mode-types'
import type {
  RailCategory,
  EntityContext,
  ClientRailProfile,
  ContextualRailData,
  ContextualRailCategoryData,
  ContextualRailItem,
  ResolvedCollapsedMetric,
  CollapsedMetric,
  RailProfile,
} from './contextual-rail-types'
import { CATEGORY_LABELS, RESOLVER_CATEGORY_MAP, categoryClass } from './contextual-rail-types'
import { applyEscalation, dedupeOperatingLoopItems } from './god-mode-assembly'
import { hasUnresolvedRailTemplate } from './rail-tier-assigner'

function extractResolverDomain(definitionId: string): string {
  const withoutPrefix = definitionId.startsWith('chef.')
    ? definitionId.slice(5)
    : definitionId.startsWith('operator.')
      ? definitionId.split('.')[1]
      : definitionId.startsWith('universal.')
        ? definitionId.slice(10)
        : definitionId
  const underscoreIdx = withoutPrefix.indexOf('_')
  return underscoreIdx > 0 ? withoutPrefix.slice(0, underscoreIdx) : withoutPrefix.split('.')[0]
}

function getResolverName(item: GodModeResolvedItem): string | null {
  const resolverName = item.data?.resolverName
  return typeof resolverName === 'string' ? resolverName : null
}

function resolveItemCategory(item: GodModeResolvedItem, profile: RailProfile): RailCategory {
  if (item.sourceKind) {
    const sourceMap: Record<string, RailCategory> = {
      event: 'time',
      inquiry: 'communication',
      task: 'actions',
      payment: 'money',
      message: 'communication',
    }
    const mapped = sourceMap[item.sourceKind]
    if (mapped && mapped !== 'actions' && profile.categories.includes(mapped)) return mapped
  }

  const resolverName = getResolverName(item)
  if (resolverName) {
    const resolverCategory = RESOLVER_CATEGORY_MAP[resolverName]
    if (
      resolverCategory &&
      resolverCategory !== 'actions' &&
      profile.categories.includes(resolverCategory)
    ) {
      return resolverCategory
    }
  }

  const domain = extractResolverDomain(item.definitionId)
  const category = RESOLVER_CATEGORY_MAP[domain]
  if (category && category !== 'actions' && profile.categories.includes(category)) return category

  return profile.primaryCategory
}

function numericField(data: Record<string, unknown>, fields: string[]): number | null {
  for (const field of fields) {
    const value = data[field]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function dateField(data: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    const value = data[field]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

function extractMetricValue(
  metric: CollapsedMetric,
  items: GodModeResolvedItem[]
): string | number | null {
  const matchingItems = items.filter((item) => {
    const resolverName = getResolverName(item)
    if (resolverName === metric.resolverKey) return true
    const domain = extractResolverDomain(item.definitionId)
    return domain === metric.resolverKey
  })

  if (matchingItems.length === 0) return null

  if (metric.format === 'number') return matchingItems.length

  const first = matchingItems[0]
  if (!first.data) return null

  if (metric.format === 'currency') {
    const cents = numericField(first.data, [
      'outstandingCents',
      'paidCents',
      'quotedCents',
      'outstandingBalanceCents',
      'totalPaidCents',
      'quotedPriceCents',
    ])
    if (cents !== null) return Math.round(cents / 100)
    return numericField(first.data, ['amount', 'total', 'outstanding'])
  }
  if (metric.format === 'percent') {
    return numericField(first.data, ['percentage', 'completion', 'completionScore', 'margin'])
  }
  if (metric.format === 'countdown') {
    return numericField(first.data, ['daysUntil', 'daysOut', 'daysRemaining'])
  }
  if (metric.format === 'date') {
    return dateField(first.data, ['lastContactAt', 'lastMessageAt', 'eventDate', 'createdAt'])
  }

  return null
}

function buildDerivedActions(
  items: GodModeResolvedItem[],
  maxItems: number
): GodModeResolvedItem[] {
  return items
    .filter((item) => item.nextAction || (item.inlineActions && item.inlineActions.length > 0))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, Math.min(4, maxItems))
    .map((item) => {
      const inlineAction = item.inlineActions?.[0]
      const actionDestination =
        inlineAction?.action === 'navigate' && typeof inlineAction.params.href === 'string'
          ? inlineAction.params.href
          : item.destination

      return {
        ...item,
        definitionId: `${item.definitionId}.action`,
        label: item.nextAction ?? inlineAction?.label ?? item.label,
        context: item.label,
        destination: actionDestination,
        sourceKind: 'task',
      }
    })
}

function toClientRailProfile(profile: RailProfile): ClientRailProfile {
  const { pattern: _pattern, entityExtract: _entityExtract, ...clientProfile } = profile
  return clientProfile
}

function toSerializableValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(toSerializableValue)
  if (!value || typeof value !== 'object') return value

  const result: Record<string, unknown> = {}
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof nestedValue === 'function' || typeof nestedValue === 'undefined') continue
    result[key] = toSerializableValue(nestedValue)
  }
  return result
}

function toContextualRailItem(item: GodModeResolvedItem): ContextualRailItem {
  return {
    ...item,
    data: item.data ? (toSerializableValue(item.data) as Record<string, unknown>) : undefined,
    expiresAt: item.expiresAt?.toISOString(),
    escalatesAt: item.escalatesAt?.toISOString(),
    inlineActions: item.inlineActions?.map((inlineAction) => ({
      ...inlineAction,
      params: toSerializableValue(inlineAction.params) as Record<string, unknown>,
    })),
  }
}

export async function assembleContextualRail(
  profile: RailProfile,
  entityContext: EntityContext | null,
  userId: string,
  tenantId: string,
  pathname: string
): Promise<ContextualRailData> {
  const now = new Date()

  const ctx: GodModeResolverContext = {
    userId,
    tenantId,
    role: 'chef',
    now,
    currentPage: pathname,
    ...(entityContext ? { entityContext } : {}),
  }

  const { dispatchFilteredResolvers, dispatchHotResolvers } = await import('./god-mode-dispatcher')

  const resolvedItems =
    profile.resolverFilter.length === 0
      ? await dispatchHotResolvers(ctx)
      : await dispatchFilteredResolvers(ctx, profile.resolverFilter)

  const filtered = dedupeOperatingLoopItems(
    resolvedItems.map((item) => applyEscalation(item, now)),
    now
  ).filter((item) => {
    if (hasUnresolvedRailTemplate(item)) return false
    if (!item.expiresAt) return true
    return item.expiresAt.getTime() > now.getTime()
  })

  const categories: Partial<Record<RailCategory, ContextualRailCategoryData>> = {}
  for (const cat of profile.categories) {
    categories[cat] = {
      category: cat,
      items: [],
      label: CATEGORY_LABELS[cat],
      colorClass: categoryClass(cat),
    }
  }

  let criticalCount = 0
  for (const item of filtered) {
    if (item.tier === 'p0' || (item.score != null && item.score >= 80)) {
      criticalCount++
    }
    const category = resolveItemCategory(item, profile)
    const categoryData = categories[category]
    if (categoryData) {
      categoryData.items.push(toContextualRailItem(item))
    }
  }

  if (profile.categories.includes('actions')) {
    categories.actions = categories.actions ?? {
      category: 'actions',
      items: [],
      label: CATEGORY_LABELS.actions,
      colorClass: categoryClass('actions'),
    }
    categories.actions.items = buildDerivedActions(filtered, profile.maxItems).map(
      toContextualRailItem
    )
  }

  for (const categoryData of Object.values(categories)) {
    categoryData.items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }

  const itemBudget = Math.ceil(profile.maxItems / Math.max(1, profile.categories.length))
  let totalItems = 0
  for (const cat of profile.categories) {
    const categoryData = categories[cat]
    if (!categoryData) continue
    categoryData.items = categoryData.items.slice(0, itemBudget)
    totalItems += categoryData.items.length
  }

  const collapsedMetrics: ResolvedCollapsedMetric[] = profile.collapsedMetrics.map((metric) => {
    if (metric.resolverKey === '_critical_count') {
      return { ...metric, value: criticalCount }
    }
    return { ...metric, value: extractMetricValue(metric, filtered) }
  })

  return {
    profile: toClientRailProfile(profile),
    categories,
    collapsedMetrics,
    criticalCount,
    totalItems,
    assembledAt: now.toISOString(),
  }
}
