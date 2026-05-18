import type {
  UniversalRailAssemblyOptions,
  UniversalRailAssemblyResult,
  UniversalRailItem,
  UniversalRailItemDefinition,
  UniversalRailRole,
  UniversalRailWeightProfile,
} from './universal-rail-types'
import { DEFAULT_SLOT_POLICY } from './universal-rail-types'
import {
  computeUniversalRailScore,
  filterSuppressedItems,
  rankUniversalRailItems,
  ROLE_WEIGHT_PROFILES,
} from './universal-rail-scoring'
import { loadRoleRegistry } from './registries'
import {
  isItemDismissed,
  isItemSuppressed,
  loadRailUserState,
  loadRailUserPreferences,
} from './universal-rail-state'
import type { RailUserState } from './universal-rail-state'
import { computeSourceAffinity, getAffinityForSource } from '@/lib/feed/affinity-computer'
import { groupFeedItems } from '@/lib/feed/aggregation'
import type { FeedItem } from '@/lib/feed/aggregation'

// ---------------------------------------------------------------------------
// Freshness window parsing
// ---------------------------------------------------------------------------

const FRESHNESS_MULTIPLIERS: Record<string, number> = {
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
}

function parseFreshnessWindow(window: string): number {
  const match = window.match(/^(\d+)([mhdw])$/)
  if (!match) return 86_400_000 // default 1 day
  const value = parseInt(match[1], 10)
  const unit = match[2]
  return value * (FRESHNESS_MULTIPLIERS[unit] ?? 86_400_000)
}

// ---------------------------------------------------------------------------
// Template resolution
// ---------------------------------------------------------------------------

function resolveTemplate(template: string, metadata: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = metadata[key]
    return value != null ? String(value) : `{${key}}`
  })
}

// ---------------------------------------------------------------------------
// Assembly pipeline
// ---------------------------------------------------------------------------

/**
 * Assemble a Universal Rail for a specific role.
 *
 * Pipeline:
 * 1. Load registry for role
 * 2. Load user state (impressions, dismissals, saves)
 * 3. Load user preferences (weight overrides, disabled categories)
 * 4. Filter: remove disabled, dismissed, and suppressed items
 * 5. Score: compute RAIL_SCORE for each surviving item
 * 6. Rank: sort by score descending
 * 7. Limit: cap to requested item count
 */
export async function assembleUniversalRail(
  options: UniversalRailAssemblyOptions
): Promise<UniversalRailAssemblyResult> {
  const {
    role,
    userId,
    tenantId,
    pageContext = null,
    now = new Date(),
    limit = 50,
    hiddenIds = [],
    dismissedIds = [],
    savedIds = [],
    pinnedIds = [],
    filters = {},
    includeDebugScores = false,
  } = options

  // 1. Load registry
  const registry = await loadRoleRegistry(role)

  // 2. Load user state (if authenticated)
  let userState: RailUserState | null = null
  let weightOverrides: Partial<UniversalRailWeightProfile> = {}
  let disabledCategories: string[] = []
  let disabledItemIds: string[] = []

  if (userId) {
    userState = await loadRailUserState(userId, role)
    const prefs = await loadRailUserPreferences(userId, role)
    if (prefs) {
      weightOverrides = prefs.weightOverrides as Partial<UniversalRailWeightProfile>
      disabledCategories = prefs.disabledCategories
      disabledItemIds = prefs.disabledItemIds
    }
  }

  // Merge weight profile with user overrides
  const baseWeights = ROLE_WEIGHT_PROFILES[role]
  const weights: UniversalRailWeightProfile = {
    ...baseWeights,
    ...weightOverrides,
  }

  // Hidden and dismissed sets (merge client-side + server-side)
  const hiddenSet = new Set(hiddenIds)
  const dismissedSet = new Set(dismissedIds)
  const savedSet = new Set(savedIds)
  const pinnedSet = new Set(pinnedIds)

  // 3-4. Filter and score
  const totalCandidates = registry.length
  const scoredItems: UniversalRailItem[] = []
  let filteredOut = 0

  for (const definition of registry) {
    // Skip disabled categories
    if (disabledCategories.includes(definition.category)) {
      filteredOut++
      continue
    }

    // Skip disabled items
    if (disabledItemIds.includes(definition.id)) {
      filteredOut++
      continue
    }

    // Skip hidden
    if (hiddenSet.has(definition.id)) {
      filteredOut++
      continue
    }

    // Check server-side dismissal
    const dismissal = userState?.dismissals.get(definition.id)
    if (isItemDismissed(dismissal, now)) {
      filteredOut++
      continue
    }

    // Check client-side dismissal
    if (dismissedSet.has(definition.id) && definition.dismissable) {
      filteredOut++
      continue
    }

    // Check impression suppression
    const impression = userState?.impressions.get(definition.id)
    if (isItemSuppressed(impression, definition.maxImpressions)) {
      filteredOut++
      continue
    }

    // Compute age
    const firstSeen = impression?.firstSeenAt
      ? new Date(impression.firstSeenAt).getTime()
      : now.getTime()
    const ageMs = now.getTime() - firstSeen
    const windowMs = parseFreshnessWindow(definition.freshnessWindow)

    // Compute relevance (basic: page context matching + filter alignment)
    let relevanceScore = 50 // baseline
    if (pageContext && definition.pageAffinity === pageContext) {
      relevanceScore += 20
    }
    // Boost if item matches active filters
    for (const signal of definition.relevanceSignals) {
      if (filters[signal]) {
        relevanceScore += 10
      }
    }

    // Compute user affinity (basic: saved/pinned boost)
    let userAffinityScore = 0
    if (savedSet.has(definition.id)) userAffinityScore += 15
    if (pinnedSet.has(definition.id)) userAffinityScore += 25
    if (userState?.saved.has(definition.id)) {
      userAffinityScore += userState.saved.get(definition.id)!.pinned ? 25 : 15
    }

    // Compute boost (pinned items get extra boost)
    let boostValue = 0
    if (pinnedSet.has(definition.id)) boostValue += 20

    // Score
    const scoreBreakdown = computeUniversalRailScore({
      definition,
      weights,
      now,
      ageMs,
      windowMs,
      relevanceScore,
      userAffinityScore,
      impressionCount: impression?.impressionCount ?? 0,
      lastSeenAt: impression?.lastSeenAt ? new Date(impression.lastSeenAt) : null,
      currentPage: pageContext,
      boostValue,
    })

    // Build runtime item
    const item: UniversalRailItem = {
      definitionId: definition.id,
      role: definition.role,
      label: resolveTemplate(definition.labelTemplate, {}),
      category: definition.category,
      presentation: definition.renderHints.presentation,
      icon: definition.renderHints.icon,
      href: definition.hrefTemplate,
      score: scoreBreakdown.final,
      baseUrgency: definition.baseUrgency,
      urgencyDecayFn: definition.urgencyDecayFn,
      privacy: definition.privacy,
      dismissable: definition.dismissable,
      expandable: definition.expandable,
      hoverAction: definition.hoverAction,
      clickAction: definition.clickAction,
      maxImpressions: definition.maxImpressions,
      cooldownMinutes: definition.cooldownMinutes,
      impressionCount: impression?.impressionCount ?? 0,
      lastSeenAt: impression?.lastSeenAt ?? null,
      dismissedAt: dismissal?.dismissedAt ?? null,
      expiresAt: null,
      metadata: {},
      debugScore: includeDebugScores ? scoreBreakdown : undefined,
    }

    scoredItems.push(item)
  }

  // 5. Filter suppressed
  const unsuppressed = filterSuppressedItems(scoredItems)

  // 6. Rank
  const ranked = rankUniversalRailItems(unsuppressed)

  // 7. Limit
  const limited = ranked.slice(0, limit)

  return {
    items: limited,
    totalCandidates,
    filteredOut,
    role,
    assembledAt: now.toISOString(),
    pageContext,
  }
}

/**
 * Assemble a rail with real-time data injected into templates.
 * This is the high-level function that components call.
 */
export async function assembleRailForPage(
  role: UniversalRailRole,
  pageContext: string,
  userId?: string,
  tenantId?: string,
  metadata?: Record<string, Record<string, unknown>>
): Promise<UniversalRailAssemblyResult> {
  const result = await assembleUniversalRail({
    role,
    userId,
    tenantId,
    pageContext,
    limit: role === 'admin' ? 100 : 50,
    includeDebugScores: false,
  })

  // Auto-resolve data if no explicit metadata provided
  let resolvedMeta = metadata
  if (!resolvedMeta && userId) {
    try {
      const { resolveRailData } = await import('./resolvers')
      resolvedMeta = await resolveRailData(role, userId, tenantId)
    } catch {
      // Resolver failure is non-critical; items keep static labels
    }
  }

  // Inject metadata into templates
  if (resolvedMeta) {
    for (const item of result.items) {
      const itemMeta = resolvedMeta[item.definitionId]
      if (itemMeta) {
        item.label = resolveTemplate(
          findDefinitionTemplate(item.definitionId) ?? item.label,
          itemMeta
        )
        item.href = resolveTemplate(item.href, itemMeta)
        item.metadata = itemMeta
      }
    }
  }

  return result
}

// Helper to find original template from cached registry
function findDefinitionTemplate(definitionId: string): string | null {
  // Import inline to access cache without circular dep
  const { findItemDefinition } = require('./registries') as {
    findItemDefinition: (id: string) => UniversalRailItemDefinition | null
  }
  const def = findItemDefinition(definitionId)
  return def?.labelTemplate ?? null
}

/**
 * Assemble rail and apply feed aggregation (grouping similar items).
 * Entry point for components that want aggregated feeds.
 */
export async function assembleAggregatedRail(
  role: UniversalRailRole,
  pageContext: string,
  userId?: string,
  tenantId?: string
): Promise<{ items: FeedItem[]; assembledAt: string }> {
  const result = await assembleRailForPage(role, pageContext, userId, tenantId)
  const grouped = groupFeedItems(result.items)
  return { items: grouped, assembledAt: result.assembledAt }
}
