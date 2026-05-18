import type { GodModeResolvedItem, GodModeResolverContext } from './god-mode-types'
import type {
  RailProfile,
  RailCategory,
  EntityContext,
  ContextualRailData,
  ContextualRailCategoryData,
  ResolvedCollapsedMetric,
  CollapsedMetric,
} from './contextual-rail-types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from './contextual-rail-types'

const RESOLVER_CATEGORY_MAP: Record<string, RailCategory> = {
  completion: 'readiness',
  prep: 'readiness',
  packing: 'readiness',
  'shopping-list': 'readiness',
  'menu-approval': 'readiness',
  onboarding: 'readiness',

  payment: 'money',
  'revenue-goal': 'money',
  'recurring-invoice': 'money',
  'vendor-invoice': 'money',
  receipt: 'money',
  'revenue-opportunity': 'money',
  quote: 'money',

  'dormant-client': 'people',
  'client-birthday': 'people',
  followup: 'people',
  staff: 'people',
  network: 'people',
  'review-request': 'people',

  event: 'time',
  contract: 'time',
  'cadence-due': 'time',
  'scheduled-message': 'time',
  hours: 'time',

  weather: 'risk',
  'equipment-conflict': 'risk',
  'quality-drift': 'risk',
  insurance: 'risk',
  certification: 'risk',

  'cil-signal': 'intelligence',
  intelligence: 'intelligence',
  'dish-fatigue': 'intelligence',
  'weather-cooking': 'intelligence',
  'lifecycle-stage': 'intelligence',

  message: 'communication',
  inquiry: 'communication',
  'communication-feed': 'communication',
  'proposal-activity': 'communication',
  waiting: 'communication',

  automation: 'actions',
  handoff: 'actions',
  resume: 'actions',
}

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
    if (mapped && profile.categories.includes(mapped)) return mapped
  }

  const domain = extractResolverDomain(item.definitionId)
  const category = RESOLVER_CATEGORY_MAP[domain]
  if (category && profile.categories.includes(category)) return category

  return profile.primaryCategory
}

function extractMetricValue(
  metric: CollapsedMetric,
  items: GodModeResolvedItem[]
): string | number | null {
  const matchingItems = items.filter((item) => {
    const domain = extractResolverDomain(item.definitionId)
    return domain === metric.resolverKey
  })

  if (matchingItems.length === 0) return null

  if (metric.format === 'number') return matchingItems.length

  const first = matchingItems[0]
  if (!first.data) return null

  if (metric.format === 'currency') {
    const amount = first.data.amount ?? first.data.total ?? first.data.outstanding
    return typeof amount === 'number' ? amount : null
  }
  if (metric.format === 'percent') {
    const pct = first.data.percentage ?? first.data.completion ?? first.data.margin
    return typeof pct === 'number' ? pct : null
  }
  if (metric.format === 'countdown') {
    const days = first.data.daysUntil ?? first.data.daysOut ?? first.data.daysRemaining
    return typeof days === 'number' ? days : null
  }

  return null
}

export async function assembleContextualRail(
  profile: RailProfile,
  entityContext: EntityContext | null,
  userId: string,
  tenantId: string
): Promise<ContextualRailData> {
  const now = new Date()

  const ctx: GodModeResolverContext = {
    userId,
    tenantId,
    role: 'chef',
    now,
    currentPage: `/${profile.id.replace(/-detail$/, 's')}`,
    ...(entityContext ? { entityContext } : {}),
  }

  const { dispatchAllResolvers, dispatchHotResolvers } = await import('./god-mode-dispatcher')

  const allItems =
    profile.resolverFilter.length === 0
      ? await dispatchHotResolvers(ctx)
      : await dispatchAllResolvers(ctx)

  const allowedDomains = new Set(profile.resolverFilter)
  const filtered =
    profile.resolverFilter.length === 0
      ? allItems
      : allItems.filter((item) => {
          const domain = extractResolverDomain(item.definitionId)
          return allowedDomains.has(domain)
        })

  const categories = {} as Record<RailCategory, ContextualRailCategoryData>
  for (const cat of profile.categories) {
    categories[cat] = {
      category: cat,
      items: [],
      label: CATEGORY_LABELS[cat],
      colorClass: CATEGORY_COLORS[cat].text,
    }
  }

  let criticalCount = 0
  for (const item of filtered) {
    if (item.tier === 'p0' || (item.score != null && item.score >= 80)) {
      criticalCount++
    }
    const category = resolveItemCategory(item, profile)
    if (categories[category]) {
      categories[category].items.push(item)
    }
  }

  for (const cat of profile.categories) {
    categories[cat].items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }

  const itemBudget = Math.ceil(profile.maxItems / profile.categories.length)
  let totalItems = 0
  for (const cat of profile.categories) {
    categories[cat].items = categories[cat].items.slice(0, itemBudget)
    totalItems += categories[cat].items.length
  }

  const collapsedMetrics: ResolvedCollapsedMetric[] = profile.collapsedMetrics.map((metric) => {
    if (metric.resolverKey === '_critical_count') {
      return { ...metric, value: criticalCount }
    }
    return { ...metric, value: extractMetricValue(metric, filtered) }
  })

  return {
    profile,
    categories,
    collapsedMetrics,
    criticalCount,
    totalItems,
    assembledAt: now.toISOString(),
  }
}
