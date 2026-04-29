import 'server-only'

import { createAdminClient } from '@/lib/db/admin'
import { matchRadarItemToChefContext, type CulinaryRadarContextEntity } from './match-chef-context'
import { normalizeRadarItem } from './normalize'
import {
  CULINARY_RADAR_SOURCES,
  getSourceDefinition,
  isCulinaryRadarSourceKey,
} from './source-registry'
import { fetchRadarSourceItems } from './fetch-source-items'
import type {
  CulinaryRadarCategory,
  CulinaryRadarNormalizedItem,
  CulinaryRadarSeverity,
  CulinaryRadarSourceKey,
} from './types'

type SourceRow = {
  id: string
  key: string
  name: string
  active: boolean
}

type ChefRow = {
  id: string
  business_name: string | null
  display_name: string | null
}

type PreferenceRow = {
  chef_id: string
  category: CulinaryRadarCategory
  enabled: boolean
  min_alert_severity: CulinaryRadarSeverity
}

type PersistedItem = {
  id: string
  source_id: string
  external_id: string
  severity: CulinaryRadarSeverity
  category: CulinaryRadarCategory
}

type IngestStats = {
  sourcesChecked: number
  sourcesSucceeded: number
  sourcesFailed: number
  itemsSeen: number
  itemsUpserted: number
  chefsChecked: number
  matchesUpserted: number
  errors: string[]
}

const DEFAULT_STATS: IngestStats = {
  sourcesChecked: 0,
  sourcesSucceeded: 0,
  sourcesFailed: 0,
  itemsSeen: 0,
  itemsUpserted: 0,
  chefsChecked: 0,
  matchesUpserted: 0,
  errors: [],
}

const SEVERITY_RANK: Record<CulinaryRadarSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
}

export async function runCulinaryRadarIngestion(): Promise<IngestStats> {
  const db: any = createAdminClient()
  const stats: IngestStats = { ...DEFAULT_STATS, errors: [] }

  await syncRadarSourceRegistry(db)

  const sourceResult = await db
    .from('culinary_radar_sources')
    .select('id, key, name, active')
    .eq('active', true)
    .order('name', { ascending: true })

  if (sourceResult.error) {
    throw new Error(sourceResult.error.message ?? 'Could not load Culinary Radar sources.')
  }

  const sourceRows = ((sourceResult.data ?? []) as SourceRow[]).filter((source) =>
    isCulinaryRadarSourceKey(source.key)
  )
  const sourceByKey = new Map(
    sourceRows.map((source) => [source.key as CulinaryRadarSourceKey, source])
  )
  const persistedItems: PersistedItem[] = []

  for (const source of sourceRows) {
    stats.sourcesChecked += 1
    const key = source.key as CulinaryRadarSourceKey
    const checkedAt = new Date().toISOString()

    try {
      const result = await fetchRadarSourceItems(key)
      stats.itemsSeen += result.items.length
      const normalized = result.items.map((item) =>
        normalizeRadarItem(item, getSourceDefinition(key))
      )

      for (const item of normalized) {
        const persisted = await upsertRadarItem(db, source, item)
        if (persisted) {
          persistedItems.push(persisted)
          stats.itemsUpserted += 1
        }
      }

      const sourceUpdate = await db
        .from('culinary_radar_sources')
        .update({
          last_checked_at: checkedAt,
          last_success_at: checkedAt,
          last_error: null,
          updated_at: checkedAt,
        })
        .eq('id', source.id)

      if (sourceUpdate.error) {
        stats.errors.push(`${source.key}: source health update failed`)
      }
      stats.sourcesSucceeded += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      stats.sourcesFailed += 1
      stats.errors.push(`${source.key}: ${message}`)
      await db
        .from('culinary_radar_sources')
        .update({ last_checked_at: checkedAt, last_error: message, updated_at: checkedAt })
        .eq('id', source.id)
    }
  }

  if (persistedItems.length === 0) {
    return stats
  }

  const chefResult = await db
    .from('chefs')
    .select('id, business_name, display_name')
    .eq('account_status', 'active')
    .eq('is_deleted', false)
    .limit(500)

  if (chefResult.error) {
    throw new Error(chefResult.error.message ?? 'Could not load chefs for Culinary Radar matching.')
  }

  for (const chef of (chefResult.data ?? []) as ChefRow[]) {
    stats.chefsChecked += 1
    try {
      const context = await loadChefRadarContext(db, chef)
      const preferences = await loadChefPreferences(db, chef.id)

      for (const item of persistedItems) {
        if (!shouldMatchCategory(item.category, item.severity, preferences)) continue

        const normalized = await loadNormalizedItemByExternalKey(db, sourceByKey, item)
        if (!normalized) continue

        const match = matchRadarItemToChefContext(normalized, context)
        const shouldInterrupt =
          item.category === 'safety' && (item.severity === 'critical' || item.severity === 'high')
        const publishable = match.relevanceScore >= 60 || shouldInterrupt
        if (!publishable) continue

        const reasons =
          match.matchReasons.length > 0
            ? match.matchReasons
            : shouldInterrupt
              ? ['Official safety source flagged this item for food businesses.']
              : ['Source category matches your Culinary Radar preferences.']

        const upsert = await db.from('chef_radar_matches').upsert(
          {
            chef_id: chef.id,
            item_id: item.id,
            relevance_score: match.relevanceScore,
            severity: item.severity,
            match_reasons: reasons,
            matched_entities: match.matchedEntities,
            recommended_actions: match.recommendedActions,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'chef_id,item_id' }
        )

        if (upsert.error) {
          stats.errors.push(`${chef.id}/${item.id}: ${upsert.error.message}`)
        } else {
          stats.matchesUpserted += 1
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      stats.errors.push(`${chef.id}: matching failed (${message})`)
    }
  }

  return stats
}

async function syncRadarSourceRegistry(db: any): Promise<void> {
  const rows = CULINARY_RADAR_SOURCES.map((source) => ({
    key: source.key,
    name: source.label,
    homepage_url: source.homepageUrl,
    source_type: source.key === 'fda_recalls' || source.key === 'fsis_recalls' ? 'api' : 'page',
    credibility_tier: source.credibilityTier,
    default_category: source.category,
    default_cadence_minutes: source.key.endsWith('recalls') ? 360 : 1440,
  }))

  const result = await db
    .from('culinary_radar_sources')
    .upsert(rows, { onConflict: 'key', ignoreDuplicates: true })

  if (result.error) {
    throw new Error(result.error.message ?? 'Could not sync Culinary Radar source registry.')
  }
}

async function upsertRadarItem(
  db: any,
  source: SourceRow,
  item: CulinaryRadarNormalizedItem
): Promise<PersistedItem | null> {
  const result = await db
    .from('culinary_radar_items')
    .upsert(
      {
        source_id: source.id,
        external_id: item.externalId,
        canonical_url: item.url,
        title: item.title,
        summary: item.summary,
        body_excerpt: item.summary,
        source_published_at: item.publishedAt,
        last_seen_at: new Date().toISOString(),
        category: item.category,
        severity: item.severity,
        credibility_tier: item.credibilityTier,
        status: item.status === 'resolved' ? 'resolved' : 'active',
        affected_entities: item.affectedEntities,
        extracted_terms: {
          tags: item.tags,
          locations: item.locations,
          signals: item.relevanceSignals,
        },
        raw_payload: item.rawPayload ?? {},
        content_hash: item.contentHash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'source_id,external_id' }
    )
    .select('id, source_id, external_id, severity, category')
    .single()

  if (result.error) {
    throw new Error(result.error.message ?? `Could not upsert radar item ${item.externalId}.`)
  }

  return result.data as PersistedItem
}

async function loadChefRadarContext(db: any, chef: ChefRow): Promise<CulinaryRadarContextEntity[]> {
  const [ingredientsResult, eventsResult, vendorsResult] = await Promise.all([
    db
      .from('ingredients')
      .select('id, name, category, allergen_flags, dietary_tags, preferred_vendor')
      .eq('tenant_id', chef.id)
      .eq('archived', false)
      .limit(200),
    db
      .from('events')
      .select(
        'id, occasion, event_date, location_city, location_state, dietary_restrictions, allergies, status'
      )
      .eq('tenant_id', chef.id)
      .in('status', ['accepted', 'paid', 'confirmed', 'in_progress'])
      .gte('event_date', new Date().toISOString().slice(0, 10))
      .limit(100),
    db.from('vendors').select('id, name, vendor_type, category').eq('chef_id', chef.id).limit(100),
  ])

  const entities: CulinaryRadarContextEntity[] = [
    {
      type: 'profile',
      id: chef.id,
      label: chef.display_name ?? chef.business_name ?? 'Chef profile',
      terms: [chef.display_name, chef.business_name].filter((value): value is string =>
        Boolean(value)
      ),
    },
  ]

  for (const ingredient of ingredientsResult.data ?? []) {
    entities.push({
      type: 'ingredient',
      id: ingredient.id,
      label: ingredient.name,
      terms: compactTerms([
        ingredient.name,
        ingredient.category,
        ingredient.preferred_vendor,
        ...(ingredient.allergen_flags ?? []),
        ...(ingredient.dietary_tags ?? []),
      ]),
      href: `/inventory/ingredients/${ingredient.id}`,
    })
  }

  for (const event of eventsResult.data ?? []) {
    entities.push({
      type: 'event',
      id: event.id,
      label: event.occasion ?? 'Upcoming event',
      terms: compactTerms([
        event.occasion,
        event.location_city,
        event.location_state,
        ...(event.dietary_restrictions ?? []),
        ...(event.allergies ?? []),
      ]),
      href: `/events/${event.id}`,
    })
  }

  for (const vendor of vendorsResult.data ?? []) {
    entities.push({
      type: 'vendor',
      id: vendor.id,
      label: vendor.name,
      terms: compactTerms([vendor.name, vendor.vendor_type, vendor.category]),
      href: `/vendors/${vendor.id}`,
    })
  }

  return entities
}

async function loadChefPreferences(
  db: any,
  chefId: string
): Promise<Map<CulinaryRadarCategory, PreferenceRow>> {
  const result = await db
    .from('chef_radar_preferences')
    .select('chef_id, category, enabled, min_alert_severity')
    .eq('chef_id', chefId)

  if (result.error) return new Map()

  return new Map(
    ((result.data ?? []) as PreferenceRow[]).map((preference) => [preference.category, preference])
  )
}

function shouldMatchCategory(
  category: CulinaryRadarCategory,
  severity: CulinaryRadarSeverity,
  preferences: Map<CulinaryRadarCategory, PreferenceRow>
): boolean {
  const preference = preferences.get(category)
  if (!preference) return true
  if (!preference.enabled)
    return category === 'safety' && SEVERITY_RANK[severity] >= SEVERITY_RANK.high
  return true
}

async function loadNormalizedItemByExternalKey(
  db: any,
  sourceByKey: Map<CulinaryRadarSourceKey, SourceRow>,
  item: PersistedItem
): Promise<CulinaryRadarNormalizedItem | null> {
  const source = [...sourceByKey.values()].find((entry) => entry.id === item.source_id)
  if (!source || !isCulinaryRadarSourceKey(source.key)) return null

  const result = await db
    .from('culinary_radar_items')
    .select(
      'external_id, title, summary, canonical_url, source_published_at, status, extracted_terms, raw_payload'
    )
    .eq('id', item.id)
    .single()

  if (result.error || !result.data) return null

  const data = result.data
  const sourceDefinition = getSourceDefinition(source.key)
  return {
    id: `${source.key}:${data.external_id}`,
    sourceKey: source.key,
    sourceLabel: sourceDefinition.label,
    sourceAuthority: sourceDefinition.authority,
    category: item.category,
    credibilityTier: sourceDefinition.credibilityTier,
    externalId: data.external_id,
    title: data.title,
    summary: data.summary ?? '',
    url: data.canonical_url,
    publishedAt: data.source_published_at ?? new Date().toISOString(),
    updatedAt: null,
    status: data.status,
    tags: Array.isArray(data.extracted_terms?.tags) ? data.extracted_terms.tags : [],
    locations: Array.isArray(data.extracted_terms?.locations) ? data.extracted_terms.locations : [],
    affectedEntities: {},
    rawPayload: {},
    severity: item.severity,
    relevanceScore: sourceDefinition.defaultRelevanceScore,
    relevanceSignals: Array.isArray(data.extracted_terms?.signals)
      ? data.extracted_terms.signals
      : [],
    contentHash: '',
  }
}

function compactTerms(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))]
}
