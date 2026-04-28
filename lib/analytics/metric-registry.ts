export type MetricDomain =
  | 'sales'
  | 'planning'
  | 'culinary'
  | 'inventory'
  | 'money'
  | 'growth'
  | 'operations'
  | 'quality'

export type MetricValueKind =
  | 'count'
  | 'currency_cents'
  | 'percent'
  | 'duration_minutes'
  | 'ratio'
  | 'score'

export type MetricRollupCadence = 'live' | 'hourly' | 'daily' | 'monthly'
export type MetricTenantScope = 'tenant_id' | 'chef_id' | 'derived_from_tenant'
export type MetricFailureMode = 'error_state_not_zero'

export interface MetricDefinition {
  id: string
  label: string
  description: string
  domain: MetricDomain
  valueKind: MetricValueKind
  rollupCadence: MetricRollupCadence
  freshnessSlaMinutes: number
  tenantScope: MetricTenantScope
  sourceTables: readonly string[]
  sourceAction: string
  surfaces: readonly string[]
  owner: string
  failureMode: MetricFailureMode
}

export interface MetricRegistryFilter {
  domain?: MetricDomain
  surface?: string
  rollupCadence?: MetricRollupCadence
  valueKind?: MetricValueKind
}

export interface MetricCoverageSummary {
  total: number
  domains: number
  surfaces: readonly string[]
  maxFreshnessSlaMinutes: number
  rollupCounts: Record<MetricRollupCadence, number>
  domainCounts: Record<MetricDomain, number>
}

export interface MetricRegistryPromptMetric {
  id: string
  label: string
  description: string
  domain: MetricDomain
  valueKind: MetricValueKind
  rollupCadence: MetricRollupCadence
  freshnessSlaMinutes: number
  sourceAction: string
  sourceTables: readonly string[]
  surfaces: readonly string[]
}

export interface MetricRegistryPromptContext {
  version: string
  total: number
  domains: number
  surfaces: readonly string[]
  metrics: readonly MetricRegistryPromptMetric[]
}

export const METRIC_REGISTRY_VERSION = '2026-04-28'

export const METRIC_DEFINITIONS: readonly MetricDefinition[] = [
  {
    id: 'money.revenue.received',
    label: 'Revenue Received',
    description: 'Ledger-backed cash received for the selected period.',
    domain: 'money',
    valueKind: 'currency_cents',
    rollupCadence: 'live',
    freshnessSlaMinutes: 15,
    tenantScope: 'tenant_id',
    sourceTables: ['ledger_entries'],
    sourceAction: 'getMonthlyRevenueTrend',
    surfaces: ['/analytics', '/insights', '/analytics/daily-report', 'remy_context'],
    owner: 'analytics',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'money.revenue.trend_18_month',
    label: '18-Month Revenue Trend',
    description: 'Monthly received revenue trend over the trailing 18 months.',
    domain: 'money',
    valueKind: 'currency_cents',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['ledger_entries'],
    sourceAction: 'getMonthlyRevenueTrend',
    surfaces: ['/insights', '/analytics'],
    owner: 'analytics',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'money.average_event_value',
    label: 'Average Event Value',
    description: 'Average realized revenue for completed events.',
    domain: 'money',
    valueKind: 'currency_cents',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['events', 'ledger_entries', 'event_financial_summary'],
    sourceAction: 'getFinancialIntelligenceStats',
    surfaces: ['/insights', '/analytics', 'remy_context'],
    owner: 'analytics',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'money.revenue_per_unit',
    label: 'Revenue Per Unit',
    description: 'Revenue normalized by guest, hour, mile, and event type.',
    domain: 'money',
    valueKind: 'duration_minutes',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['events', 'ledger_entries'],
    sourceAction: 'getRevenuePerUnitStats',
    surfaces: ['/analytics', '/analytics/daily-report', 'remy_context'],
    owner: 'finance',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'money.tenant_financial_summary',
    label: 'Tenant Financial Summary',
    description:
      'Tenant-level revenue, paid amount, and balance summary computed from ledger entries.',
    domain: 'money',
    valueKind: 'currency_cents',
    rollupCadence: 'live',
    freshnessSlaMinutes: 15,
    tenantScope: 'tenant_id',
    sourceTables: ['events', 'ledger_entries'],
    sourceAction: 'getTenantFinancialSummary',
    surfaces: ['/dashboard', '/analytics/daily-report', 'remy_context'],
    owner: 'finance',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'sales.inquiry_conversion_rate',
    label: 'Inquiry Conversion Rate',
    description: 'Share of inquiries that convert into booked or completed events.',
    domain: 'sales',
    valueKind: 'percent',
    rollupCadence: 'hourly',
    freshnessSlaMinutes: 60,
    tenantScope: 'tenant_id',
    sourceTables: ['inquiries', 'events'],
    sourceAction: 'getInquiryFunnelStats',
    surfaces: ['/analytics', '/analytics/funnel', '/analytics/daily-report'],
    owner: 'sales',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'sales.quote_acceptance_rate',
    label: 'Quote Acceptance Rate',
    description: 'Share of sent quotes that are accepted.',
    domain: 'sales',
    valueKind: 'percent',
    rollupCadence: 'hourly',
    freshnessSlaMinutes: 60,
    tenantScope: 'tenant_id',
    sourceTables: ['quotes', 'events'],
    sourceAction: 'getQuoteAcceptanceStats',
    surfaces: ['/analytics', '/analytics/funnel', 'remy_context'],
    owner: 'sales',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'sales.pipeline_value',
    label: 'Pipeline Value',
    description: 'Expected revenue across active inquiries, quotes, and proposed events.',
    domain: 'sales',
    valueKind: 'currency_cents',
    rollupCadence: 'hourly',
    freshnessSlaMinutes: 60,
    tenantScope: 'tenant_id',
    sourceTables: ['inquiries', 'quotes', 'events'],
    sourceAction: 'getPipelineRevenueForecast',
    surfaces: ['/analytics', '/analytics/pipeline', '/analytics/daily-report'],
    owner: 'sales',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'sales.response_time_sla',
    label: 'Response Time SLA',
    description: 'Median response time and SLA adherence for new inquiries.',
    domain: 'sales',
    valueKind: 'duration_minutes',
    rollupCadence: 'hourly',
    freshnessSlaMinutes: 60,
    tenantScope: 'tenant_id',
    sourceTables: ['inquiries', 'messages'],
    sourceAction: 'getResponseTimeSummary',
    surfaces: ['/analytics', '/analytics/funnel', '/dashboard'],
    owner: 'sales',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'growth.client_repeat_rate',
    label: 'Client Repeat Rate',
    description: 'Share of clients with two or more completed or confirmed events.',
    domain: 'growth',
    valueKind: 'percent',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['clients', 'events'],
    sourceAction: 'getRetentionStats',
    surfaces: ['/insights', '/analytics', 'remy_context'],
    owner: 'growth',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'growth.client_lifetime_value',
    label: 'Client Lifetime Value',
    description: 'Revenue distribution and totals by client over their full history.',
    domain: 'growth',
    valueKind: 'currency_cents',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['clients', 'events', 'ledger_entries'],
    sourceAction: 'getClientLTVDistribution',
    surfaces: ['/insights', '/analytics/client-ltv', '/analytics'],
    owner: 'growth',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'growth.client_acquisition_source',
    label: 'Client Acquisition Source',
    description: 'How clients first found the business.',
    domain: 'growth',
    valueKind: 'count',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['clients', 'inquiries'],
    sourceAction: 'getClientAcquisitionStats',
    surfaces: ['/insights', '/analytics/referral-sources', '/analytics'],
    owner: 'growth',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'growth.dormant_client_count',
    label: 'Dormant Client Count',
    description: 'Clients with no recent booking activity inside the dormancy window.',
    domain: 'growth',
    valueKind: 'count',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['clients', 'events'],
    sourceAction: 'getRetentionStats',
    surfaces: ['/insights', '/dashboard', '/analytics/daily-report'],
    owner: 'growth',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'planning.event_volume',
    label: 'Event Volume',
    description: 'Count of events by month, status, or selected date range.',
    domain: 'planning',
    valueKind: 'count',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['events'],
    sourceAction: 'getMonthlyEventVolume',
    surfaces: ['/insights', '/analytics', '/analytics/daily-report'],
    owner: 'operations',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'planning.event_status_mix',
    label: 'Event Status Mix',
    description:
      'Distribution of event states across draft, proposed, accepted, paid, and complete.',
    domain: 'planning',
    valueKind: 'count',
    rollupCadence: 'hourly',
    freshnessSlaMinutes: 60,
    tenantScope: 'tenant_id',
    sourceTables: ['events'],
    sourceAction: 'getStageConversionData',
    surfaces: ['/analytics', '/dashboard', 'remy_context'],
    owner: 'operations',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'planning.day_of_week_demand',
    label: 'Day of Week Demand',
    description: 'Historic booking concentration by weekday.',
    domain: 'planning',
    valueKind: 'count',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['events'],
    sourceAction: 'getDayOfWeekDistribution',
    surfaces: ['/insights', '/analytics/demand'],
    owner: 'operations',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'planning.seasonality',
    label: 'Seasonality',
    description: 'Busiest and slowest months across event history.',
    domain: 'planning',
    valueKind: 'count',
    rollupCadence: 'monthly',
    freshnessSlaMinutes: 10080,
    tenantScope: 'tenant_id',
    sourceTables: ['events'],
    sourceAction: 'getBookingSeasonality',
    surfaces: ['/insights', '/analytics/demand', '/analytics'],
    owner: 'operations',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'culinary.menu_usage',
    label: 'Menu Usage',
    description: 'Most-picked menus based on linked event menu records.',
    domain: 'culinary',
    valueKind: 'count',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['events', 'menus'],
    sourceAction: 'getCulinaryUsageStats',
    surfaces: ['/insights', '/analytics', 'remy_context'],
    owner: 'culinary',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'culinary.recipe_usage',
    label: 'Recipe Usage',
    description: 'Most-used recipes based on linked dishes, components, and recipe records.',
    domain: 'culinary',
    valueKind: 'count',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['events', 'menus', 'dishes', 'components', 'recipes'],
    sourceAction: 'getCulinaryUsageStats',
    surfaces: ['/insights', '/analytics', 'remy_context'],
    owner: 'culinary',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'culinary.ingredient_usage',
    label: 'Ingredient Usage',
    description: 'Most-used ingredients based on recipe ingredients inside linked event menus.',
    domain: 'culinary',
    valueKind: 'count',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: [
      'events',
      'menus',
      'dishes',
      'components',
      'recipes',
      'recipe_ingredients',
      'ingredients',
    ],
    sourceAction: 'getCulinaryUsageStats',
    surfaces: ['/insights', '/analytics', 'remy_context'],
    owner: 'culinary',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'culinary.dietary_restriction_frequency',
    label: 'Dietary Restriction Frequency',
    description: 'Frequency of dietary restrictions across client and event profiles.',
    domain: 'culinary',
    valueKind: 'count',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['clients', 'events'],
    sourceAction: 'getDietaryRestrictionFrequency',
    surfaces: ['/insights', '/analytics'],
    owner: 'culinary',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'culinary.menu_coverage',
    label: 'Menu Coverage',
    description: 'Share of tracked events that have linked menu data.',
    domain: 'culinary',
    valueKind: 'percent',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['events', 'menus'],
    sourceAction: 'getCulinaryUsageStats',
    surfaces: ['/insights', '/analytics'],
    owner: 'culinary',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'inventory.food_cost_rate',
    label: 'Food Cost Rate',
    description: 'Food expenses divided by realized event revenue.',
    domain: 'inventory',
    valueKind: 'percent',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['expenses', 'ledger_entries', 'event_financial_summary'],
    sourceAction: 'getFoodCostTrend',
    surfaces: ['/analytics', '/analytics/daily-report'],
    owner: 'finance',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'inventory.ingredient_cost_stats',
    label: 'Ingredient Cost Stats',
    description: 'Ingredient cost statistics used for recipe and menu costing.',
    domain: 'inventory',
    valueKind: 'duration_minutes',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['ingredients', 'recipe_ingredients'],
    sourceAction: 'getIngredientCostStats',
    surfaces: ['/analytics', '/inventory', 'remy_context'],
    owner: 'inventory',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'operations.phase_time_average',
    label: 'Phase Time Average',
    description: 'Average minutes spent in planning, shopping, prep, service, and cleanup phases.',
    domain: 'operations',
    valueKind: 'duration_minutes',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['events'],
    sourceAction: 'getPhaseTimeStats',
    surfaces: ['/insights', '/analytics', 'remy_context'],
    owner: 'operations',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'operations.forgotten_item_frequency',
    label: 'Forgotten Item Frequency',
    description: 'Most common forgotten items recorded in after-action reviews.',
    domain: 'operations',
    valueKind: 'count',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['after_action_reviews'],
    sourceAction: 'getAARRatingTrends',
    surfaces: ['/insights', '/analytics'],
    owner: 'operations',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'quality.aar_rating_trend',
    label: 'AAR Rating Trend',
    description: 'Calm, preparation, and execution scores from after-action reviews.',
    domain: 'quality',
    valueKind: 'score',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['after_action_reviews'],
    sourceAction: 'getAARRatingTrends',
    surfaces: ['/insights', '/analytics', 'remy_context'],
    owner: 'quality',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'quality.client_satisfaction',
    label: 'Client Satisfaction',
    description: 'Client survey scores collected after events.',
    domain: 'quality',
    valueKind: 'score',
    rollupCadence: 'daily',
    freshnessSlaMinutes: 1440,
    tenantScope: 'tenant_id',
    sourceTables: ['client_satisfaction_surveys'],
    sourceAction: 'getNpsStats',
    surfaces: ['/analytics', '/feedback', 'remy_context'],
    owner: 'quality',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'quality.benchmark_percentile',
    label: 'Benchmark Percentile',
    description: 'Chef performance compared with stored benchmark snapshots.',
    domain: 'quality',
    valueKind: 'score',
    rollupCadence: 'monthly',
    freshnessSlaMinutes: 43200,
    tenantScope: 'tenant_id',
    sourceTables: ['benchmark_snapshots', 'events', 'expenses', 'inquiries'],
    sourceAction: 'getBenchmarkHistory',
    surfaces: ['/analytics/benchmarks', '/analytics'],
    owner: 'quality',
    failureMode: 'error_state_not_zero',
  },
  {
    id: 'operations.activity_volume',
    label: 'Activity Volume',
    description: 'Count of operational activity records by domain and time period.',
    domain: 'operations',
    valueKind: 'count',
    rollupCadence: 'hourly',
    freshnessSlaMinutes: 60,
    tenantScope: 'tenant_id',
    sourceTables: ['chef_activity_log'],
    sourceAction: 'getActivityCountsByDomain',
    surfaces: ['/activity', '/dashboard', 'remy_context'],
    owner: 'operations',
    failureMode: 'error_state_not_zero',
  },
]

export function assertMetricIdsUnique(
  definitions: readonly MetricDefinition[] = METRIC_DEFINITIONS
) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const definition of definitions) {
    if (seen.has(definition.id)) duplicates.add(definition.id)
    seen.add(definition.id)
  }

  if (duplicates.size > 0) {
    throw new Error(`Duplicate metric ids: ${Array.from(duplicates).sort().join(', ')}`)
  }
}

export function getMetricDefinition(id: string): MetricDefinition | null {
  return METRIC_DEFINITIONS.find((definition) => definition.id === id) ?? null
}

export function listMetricDefinitions(
  filter: MetricRegistryFilter = {}
): readonly MetricDefinition[] {
  return METRIC_DEFINITIONS.filter((definition) => {
    if (filter.domain && definition.domain !== filter.domain) return false
    if (filter.rollupCadence && definition.rollupCadence !== filter.rollupCadence) return false
    if (filter.valueKind && definition.valueKind !== filter.valueKind) return false
    if (filter.surface && !definition.surfaces.includes(filter.surface)) return false
    return true
  })
}

export function findMetricsBySurface(surface: string): readonly MetricDefinition[] {
  return listMetricDefinitions({ surface })
}

export function findMetricDefinitionsByQuery(
  query: string,
  options: { surface?: string; limit?: number } = {}
): readonly MetricDefinition[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []

  const tokens = normalizedQuery
    .replace(/[^a-z0-9_.\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3)

  const definitions = options.surface
    ? listMetricDefinitions({ surface: options.surface })
    : METRIC_DEFINITIONS

  const scored = definitions
    .map((definition) => {
      const haystack = [
        definition.id,
        definition.label,
        definition.description,
        definition.domain,
        definition.valueKind,
        definition.sourceAction,
        definition.sourceTables.join(' '),
        definition.surfaces.join(' '),
      ]
        .join(' ')
        .toLowerCase()

      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0)
      return { definition, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.definition.label.localeCompare(b.definition.label))

  return scored.slice(0, options.limit ?? 5).map((entry) => entry.definition)
}

export function getMetricRegistryPromptContext(
  surface = 'remy_context',
  limit = 16
): MetricRegistryPromptContext {
  const metrics = findMetricsBySurface(surface)
    .slice(0, limit)
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      description: definition.description,
      domain: definition.domain,
      valueKind: definition.valueKind,
      rollupCadence: definition.rollupCadence,
      freshnessSlaMinutes: definition.freshnessSlaMinutes,
      sourceAction: definition.sourceAction,
      sourceTables: definition.sourceTables,
      surfaces: definition.surfaces,
    }))

  const summary = getMetricCoverageSummary(METRIC_DEFINITIONS)

  return {
    version: METRIC_REGISTRY_VERSION,
    total: summary.total,
    domains: summary.domains,
    surfaces: summary.surfaces,
    metrics,
  }
}

export function formatMetricRegistryForPrompt(context: MetricRegistryPromptContext): string {
  const lines = [
    `METRIC TRUTH REGISTRY v${context.version}: ${context.total} canonical metrics across ${context.domains} domains.`,
    'Use these definitions when answering analytics, statistics, dashboard, or data-source questions. If a metric is not listed or loaded, say that the registry does not expose it in this context.',
  ]

  for (const metric of context.metrics) {
    lines.push(
      `- ${metric.label} (${metric.id}): ${metric.description} Domain: ${metric.domain}. Value: ${metric.valueKind}. Rollup: ${metric.rollupCadence}. SLA: ${metric.freshnessSlaMinutes} minutes. Source action: ${metric.sourceAction}. Tables: ${metric.sourceTables.join(', ')}.`
    )
  }

  lines.push('Full registry is visible in ChefFlow at /insights under Metric Registry.')
  return lines.join('\n')
}

export function getMetricCoverageSummary(
  definitions: readonly MetricDefinition[] = METRIC_DEFINITIONS
): MetricCoverageSummary {
  const rollupCounts: Record<MetricRollupCadence, number> = {
    live: 0,
    hourly: 0,
    daily: 0,
    monthly: 0,
  }
  const domainCounts: Record<MetricDomain, number> = {
    sales: 0,
    planning: 0,
    culinary: 0,
    inventory: 0,
    money: 0,
    growth: 0,
    operations: 0,
    quality: 0,
  }
  const domains = new Set<MetricDomain>()
  const surfaces = new Set<string>()
  let maxFreshnessSlaMinutes = 0

  for (const definition of definitions) {
    rollupCounts[definition.rollupCadence] += 1
    domainCounts[definition.domain] += 1
    domains.add(definition.domain)
    maxFreshnessSlaMinutes = Math.max(maxFreshnessSlaMinutes, definition.freshnessSlaMinutes)

    for (const surface of definition.surfaces) {
      surfaces.add(surface)
    }
  }

  return {
    total: definitions.length,
    domains: domains.size,
    surfaces: Array.from(surfaces).sort(),
    maxFreshnessSlaMinutes,
    rollupCounts,
    domainCounts,
  }
}

export function isMetricStale(
  lastComputedAt: Date | string | null,
  freshnessSlaMinutes: number,
  now: Date = new Date()
): boolean {
  if (!lastComputedAt) return true

  const lastComputedDate =
    lastComputedAt instanceof Date ? lastComputedAt : new Date(lastComputedAt)

  if (Number.isNaN(lastComputedDate.getTime())) return true

  const ageMs = now.getTime() - lastComputedDate.getTime()
  return ageMs > freshnessSlaMinutes * 60_000
}
