'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  FRESHNESS_THRESHOLDS,
  type FreshnessLevel,
  type FreshnessResult,
  type StalenessSummary,
} from './freshness-types'

// ============================================
// PURE UTILITY: classify a single entity
// ============================================

/**
 * Classify freshness for a single entity based on its updated_at timestamp.
 * Pure function, no DB or auth. Exported for reuse by other modules.
 */
export function classifyFreshness(
  updatedAt: string | null,
  entityType: string,
  entityId: string = '',
  entityName: string = ''
): FreshnessResult {
  const thresholds = FRESHNESS_THRESHOLDS[entityType] ?? FRESHNESS_THRESHOLDS.recipe

  if (!updatedAt) {
    return {
      entityType,
      entityId,
      entityName,
      level: 'outdated',
      daysSinceUpdate: Infinity,
      lastUpdatedAt: null,
      recommendation: `No update timestamp recorded. Review and update this ${entityType}.`,
    }
  }

  const now = Date.now()
  const updated = new Date(updatedAt).getTime()
  const daysSinceUpdate = Math.floor((now - updated) / (1000 * 60 * 60 * 24))

  let level: FreshnessLevel
  if (daysSinceUpdate <= thresholds.fresh) {
    level = 'fresh'
  } else if (daysSinceUpdate <= thresholds.recent) {
    level = 'recent'
  } else if (daysSinceUpdate <= thresholds.aging) {
    level = 'aging'
  } else if (daysSinceUpdate <= thresholds.stale) {
    level = 'stale'
  } else {
    level = 'outdated'
  }

  const recommendation = buildRecommendation(level, entityType, daysSinceUpdate)

  return {
    entityType,
    entityId,
    entityName,
    level,
    daysSinceUpdate,
    lastUpdatedAt: updatedAt,
    recommendation,
  }
}

function buildRecommendation(
  level: FreshnessLevel,
  entityType: string,
  days: number
): string | null {
  switch (level) {
    case 'fresh':
    case 'recent':
      return null
    case 'aging':
      return `This ${entityType} was last updated ${days} days ago. Consider reviewing it.`
    case 'stale':
      return `This ${entityType} is stale (${days} days). Review and update to keep it accurate.`
    case 'outdated':
      return `This ${entityType} is outdated (${days} days). Strongly recommended to review and refresh.`
  }
}

// ============================================
// STALE RECIPES (90+ days)
// ============================================

export async function getStaleRecipes(
  limit: number = 20
): Promise<{ ok: boolean; data?: FreshnessResult[]; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()
    const tenantId = user.tenantId ?? user.entityId

    const { data: rows, error } = await db
      .from('recipes')
      .select('id, name, updated_at')
      .eq('tenant_id', tenantId)
      .eq('archived', false)
      .order('updated_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('[Freshness] getStaleRecipes failed:', error)
      return { ok: false, error: 'Failed to fetch recipes' }
    }

    const results: FreshnessResult[] = (rows ?? [])
      .map((r: { id: string; name: string; updated_at: string | null }) =>
        classifyFreshness(r.updated_at, 'recipe', r.id, r.name)
      )
      .filter((r: FreshnessResult) => r.level === 'aging' || r.level === 'stale' || r.level === 'outdated')

    return { ok: true, data: results }
  } catch (err) {
    console.error('[Freshness] getStaleRecipes error:', err)
    return { ok: false, error: 'Unexpected error fetching stale recipes' }
  }
}

// ============================================
// STALE CLIENTS (120+ days no update)
// ============================================

export async function getStaleClients(
  limit: number = 20
): Promise<{ ok: boolean; data?: FreshnessResult[]; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()
    const tenantId = user.tenantId ?? user.entityId

    const { data: rows, error } = await db
      .from('clients')
      .select('id, full_name, updated_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('updated_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('[Freshness] getStaleClients failed:', error)
      return { ok: false, error: 'Failed to fetch clients' }
    }

    const results: FreshnessResult[] = (rows ?? [])
      .map((r: { id: string; full_name: string; updated_at: string | null }) =>
        classifyFreshness(r.updated_at, 'client', r.id, r.full_name ?? 'Unnamed client')
      )
      .filter((r: FreshnessResult) => r.level === 'aging' || r.level === 'stale' || r.level === 'outdated')

    return { ok: true, data: results }
  } catch (err) {
    console.error('[Freshness] getStaleClients error:', err)
    return { ok: false, error: 'Unexpected error fetching stale clients' }
  }
}

// ============================================
// STALENESS OVERVIEW (aggregate)
// ============================================

export async function getStalenessOverview(): Promise<{
  ok: boolean
  data?: StalenessSummary
  error?: string
}> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()
    const tenantId = user.tenantId ?? user.entityId

    // Fetch all entity types in parallel
    // recipes: soft-delete via archived boolean
    // clients: soft-delete via status column
    // menus: soft-delete via deleted_at
    // events: no soft-delete column
    const [recipesRes, clientsRes, menusRes, eventsRes] = await Promise.all([
      db
        .from('recipes')
        .select('id, name, updated_at')
        .eq('tenant_id', tenantId)
        .eq('archived', false),
      db
        .from('clients')
        .select('id, full_name, updated_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'active'),
      db
        .from('menus')
        .select('id, name, updated_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),
      db
        .from('events')
        .select('id, occasion, event_date, updated_at')
        .eq('tenant_id', tenantId),
    ])

    const allResults: FreshnessResult[] = []

    for (const row of recipesRes.data ?? []) {
      allResults.push(classifyFreshness(row.updated_at, 'recipe', row.id, row.name))
    }
    for (const row of clientsRes.data ?? []) {
      allResults.push(
        classifyFreshness(row.updated_at, 'client', row.id, row.full_name ?? 'Unnamed client')
      )
    }
    for (const row of menusRes.data ?? []) {
      allResults.push(classifyFreshness(row.updated_at, 'menu', row.id, row.name))
    }
    for (const row of eventsRes.data ?? []) {
      const eventLabel = row.occasion
        ? `${row.occasion} (${row.event_date})`
        : `Event ${row.event_date}`
      allResults.push(classifyFreshness(row.updated_at, 'event', row.id, eventLabel))
    }

    const summary: StalenessSummary = {
      fresh: 0,
      recent: 0,
      aging: 0,
      stale: 0,
      outdated: 0,
      total: allResults.length,
      stalestItems: [],
    }

    for (const r of allResults) {
      summary[r.level]++
    }

    // Top 10 stalest items
    summary.stalestItems = allResults
      .filter((r) => r.level !== 'fresh' && r.level !== 'recent')
      .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
      .slice(0, 10)

    return { ok: true, data: summary }
  } catch (err) {
    console.error('[Freshness] getStalenessOverview error:', err)
    return { ok: false, error: 'Unexpected error computing staleness overview' }
  }
}

// ============================================
// SINGLE ENTITY FRESHNESS
// ============================================

const ENTITY_TABLE_MAP: Record<string, { table: string; nameCol: string }> = {
  recipe: { table: 'recipes', nameCol: 'name' },
  client: { table: 'clients', nameCol: 'full_name' },
  menu: { table: 'menus', nameCol: 'name' },
  event: { table: 'events', nameCol: 'occasion' },
}

export async function getEntityFreshness(
  entityType: string,
  entityId: string
): Promise<{ ok: boolean; data?: FreshnessResult; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()
    const tenantId = user.tenantId ?? user.entityId

    const mapping = ENTITY_TABLE_MAP[entityType]
    if (!mapping) {
      return { ok: false, error: `Unknown entity type: ${entityType}` }
    }

    const { data: row, error } = await db
      .from(mapping.table)
      .select(`id, ${mapping.nameCol}, updated_at`)
      .eq('tenant_id', tenantId)
      .eq('id', entityId)
      .single()

    if (error || !row) {
      return { ok: false, error: `Entity not found: ${entityType}/${entityId}` }
    }

    const result = classifyFreshness(
      row.updated_at,
      entityType,
      row.id,
      row[mapping.nameCol] ?? `Unnamed ${entityType}`
    )

    return { ok: true, data: result }
  } catch (err) {
    console.error('[Freshness] getEntityFreshness error:', err)
    return { ok: false, error: 'Unexpected error fetching entity freshness' }
  }
}
