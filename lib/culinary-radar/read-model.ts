import 'server-only'

import { createServerClient } from '@/lib/db/server'
import type {
  RadarCategory,
  RadarDeliveryState,
  RadarLoadResult,
  RadarMatchView,
  RadarPreferenceLoadResult,
  RadarPreferenceView,
  RadarSeverity,
  RadarSourceSummary,
} from '@/lib/culinary-radar/view-model'

type JsonRecord = Record<string, unknown>

type MatchRow = {
  id: string
  chef_id: string
  item_id: string
  relevance_score: number
  severity: RadarSeverity
  match_reasons: unknown
  matched_entities: unknown
  recommended_actions: unknown
  delivery_state: RadarDeliveryState
  useful_feedback: boolean | null
  created_at: string
  read_at: string | null
  dismissed_at: string | null
}

type ItemRow = {
  id: string
  source_id: string
  title: string
  summary: string | null
  canonical_url: string
  source_published_at: string | null
  category: RadarCategory
  status: string
  credibility_tier: string
}

type SourceRow = {
  id: string
  key: string
  name: string
  homepage_url: string | null
  source_type: string
  credibility_tier: string
  default_category: RadarCategory
  active: boolean
  last_checked_at: string | null
  last_success_at: string | null
  last_error: string | null
}

const RADAR_CATEGORIES: RadarCategory[] = [
  'safety',
  'opportunity',
  'sustainability',
  'craft',
  'business',
  'local',
  'client_signal',
]

export async function loadRadarDataForChef(
  chefId: string,
  state?: RadarDeliveryState,
  limit = 50
): Promise<RadarLoadResult> {
  const db: any = createServerClient()

  const sourcesResult = await db
    .from('culinary_radar_sources')
    .select(
      'id, key, name, homepage_url, source_type, credibility_tier, default_category, active, last_checked_at, last_success_at, last_error'
    )
    .order('name', { ascending: true })

  if (sourcesResult.error) {
    return {
      success: false,
      error: sourcesResult.error.message ?? 'Could not load Culinary Radar sources.',
      matches: [],
      sources: [],
    }
  }

  let matchQuery = db
    .from('chef_radar_matches')
    .select(
      'id, chef_id, item_id, relevance_score, severity, match_reasons, matched_entities, recommended_actions, delivery_state, useful_feedback, created_at, read_at, dismissed_at'
    )
    .eq('chef_id', chefId)

  if (state) {
    matchQuery = matchQuery.eq('delivery_state', state)
  } else {
    matchQuery = matchQuery.not('delivery_state', 'in', '("dismissed","archived")')
  }

  const matchesResult = await matchQuery.order('created_at', { ascending: false }).limit(limit)

  if (matchesResult.error) {
    return {
      success: false,
      error: matchesResult.error.message ?? 'Could not load Culinary Radar matches.',
      matches: [],
      sources: (sourcesResult.data ?? []).map(mapSource),
    }
  }

  const matchRows = (matchesResult.data ?? []) as MatchRow[]
  const itemIds = matchRows.map((match) => match.item_id)

  if (itemIds.length === 0) {
    return {
      success: true,
      matches: [],
      sources: (sourcesResult.data ?? []).map(mapSource),
    }
  }

  const itemsResult = await db
    .from('culinary_radar_items')
    .select(
      'id, source_id, title, summary, canonical_url, source_published_at, category, status, credibility_tier'
    )
    .in('id', itemIds)

  if (itemsResult.error) {
    return {
      success: false,
      error: itemsResult.error.message ?? 'Could not load Culinary Radar items.',
      matches: [],
      sources: (sourcesResult.data ?? []).map(mapSource),
    }
  }

  const itemsById = mapRowsById<ItemRow>(itemsResult.data)
  const sourcesById = mapRowsById<SourceRow>(sourcesResult.data)

  return {
    success: true,
    sources: (sourcesResult.data ?? []).map(mapSource),
    matches: matchRows
      .map((match) => {
        const item = itemsById.get(match.item_id)
        if (!item) return null
        return mapMatch(match, item, sourcesById.get(item.source_id))
      })
      .filter((match): match is RadarMatchView => Boolean(match)),
  }
}

export async function loadRadarPreferencesForChef(
  chefId: string
): Promise<RadarPreferenceLoadResult> {
  const db: any = createServerClient()
  const result = await db
    .from('chef_radar_preferences')
    .select('category, enabled, email_enabled, min_alert_severity, digest_frequency')
    .eq('chef_id', chefId)

  if (result.error) {
    return {
      success: false,
      error: result.error.message ?? 'Could not load Culinary Radar preferences.',
      preferences: defaultPreferences(),
    }
  }

  const byCategory = new Map<string, any>(
    (result.data ?? []).map((row: any) => [row.category, row])
  )
  return {
    success: true,
    preferences: RADAR_CATEGORIES.map((category) => {
      const row = byCategory.get(category)
      return {
        category,
        enabled: row?.enabled ?? true,
        emailEnabled: row?.email_enabled ?? false,
        minAlertSeverity: row?.min_alert_severity ?? 'high',
        digestFrequency: row?.digest_frequency ?? 'daily',
      }
    }),
  }
}

export function summarizeRadarMatches(matches: RadarMatchView[]) {
  return {
    total: matches.length,
    critical: matches.filter((match) => match.severity === 'critical').length,
    high: matches.filter((match) => match.severity === 'high').length,
    unread: matches.filter((match) => match.deliveryState === 'unread').length,
  }
}

export function radarCategories(): RadarCategory[] {
  return [...RADAR_CATEGORIES]
}

function defaultPreferences(): RadarPreferenceView[] {
  return RADAR_CATEGORIES.map((category) => ({
    category,
    enabled: true,
    emailEnabled: false,
    minAlertSeverity: 'high',
    digestFrequency: 'daily',
  }))
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'label' in item) {
        const label = (item as JsonRecord).label
        return typeof label === 'string' ? label : null
      }
      if (item && typeof item === 'object' && 'reason' in item) {
        const reason = (item as JsonRecord).reason
        return typeof reason === 'string' ? reason : null
      }
      return null
    })
    .filter((item): item is string => Boolean(item))
}

function asMatchedEntities(
  value: unknown
): Array<{ type: string; id?: string; label: string; href?: string }> {
  if (!Array.isArray(value)) return []

  const entities: Array<{ type: string; id?: string; label: string; href?: string }> = []

  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as JsonRecord
    const type = typeof record.type === 'string' ? record.type : 'record'
    const id = typeof record.id === 'string' ? record.id : undefined
    const label = typeof record.label === 'string' ? record.label : id || type
    const href = typeof record.href === 'string' ? record.href : undefined
    entities.push({ type, id, label, href })
  }

  return entities
}

function mapRowsById<T extends { id: string }>(rows: unknown): Map<string, T> {
  if (!Array.isArray(rows)) return new Map()
  return new Map(
    rows
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const row = item as T
        return typeof row.id === 'string' ? ([row.id, row] as const) : null
      })
      .filter((entry): entry is readonly [string, T] => Boolean(entry))
  )
}

function mapSource(row: SourceRow): RadarSourceSummary {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    homepageUrl: row.homepage_url,
    sourceType: row.source_type,
    credibilityTier: row.credibility_tier,
    defaultCategory: row.default_category,
    active: row.active,
    lastCheckedAt: row.last_checked_at,
    lastSuccessAt: row.last_success_at,
    lastError: row.last_error,
  }
}

function mapMatch(row: MatchRow, item: ItemRow, source: SourceRow | undefined): RadarMatchView {
  return {
    id: row.id,
    itemId: row.item_id,
    relevanceScore: row.relevance_score,
    severity: row.severity,
    deliveryState: row.delivery_state,
    matchReasons: asStringList(row.match_reasons),
    matchedEntities: asMatchedEntities(row.matched_entities),
    recommendedActions: asStringList(row.recommended_actions),
    createdAt: row.created_at,
    readAt: row.read_at,
    dismissedAt: row.dismissed_at,
    item: {
      title: item.title,
      summary: item.summary,
      canonicalUrl: item.canonical_url,
      sourcePublishedAt: item.source_published_at,
      category: item.category,
      status: item.status,
      sourceName: source?.name ?? 'External source',
      credibilityTier: source?.credibility_tier ?? item.credibility_tier,
    },
  }
}
