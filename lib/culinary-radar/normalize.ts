import { createHash } from 'node:crypto'
import { assessRadarRelevance, assessRadarSeverity } from './severity'
import { getSourceDefinition } from './source-registry'
import type {
  CulinaryRadarNormalizedItem,
  CulinaryRadarRawItem,
  CulinaryRadarSourceDefinition,
} from './types'

export function normalizeRadarItem(
  item: CulinaryRadarRawItem,
  source = getSourceDefinition(item.sourceKey)
): CulinaryRadarNormalizedItem {
  const externalId = normalizeKey(item.externalId)
  const title = normalizeTitle(item.title)
  const summary = normalizeSentence(item.summary)
  const url = normalizeUrl(item.url)
  const publishedAt = normalizeDate(item.publishedAt)
  const updatedAt = item.updatedAt ? normalizeDate(item.updatedAt) : null
  const status = item.status ? normalizeSentence(item.status) : null
  const tags = normalizeList(item.tags ?? [])
  const locations = normalizeList(item.locations ?? [])
  const severity = assessRadarSeverity({
    sourceAuthority: source.authority,
    title,
    summary,
    tags,
    publishedAt,
  })
  const relevance = assessRadarRelevance({ title, summary, tags })
  const id = buildRadarItemId(source.key, externalId)
  const contentHash = buildContentHash({
    sourceKey: source.key,
    externalId,
    title,
    summary,
    url,
    publishedAt,
    status,
    tags,
    locations,
    severity,
  })

  return {
    id,
    sourceKey: source.key,
    sourceLabel: source.label,
    sourceAuthority: source.authority,
    externalId,
    title,
    summary,
    url,
    publishedAt,
    updatedAt,
    status,
    tags,
    locations,
    severity,
    relevanceScore: Math.max(relevance.score, source.defaultRelevanceScore),
    relevanceSignals: relevance.matchedSignals,
    contentHash,
  }
}

export function normalizeRadarItems(items: CulinaryRadarRawItem[]): CulinaryRadarNormalizedItem[] {
  return items
    .map((item) => normalizeRadarItem(item))
    .sort((a, b) => {
      const dateCompare = b.publishedAt.localeCompare(a.publishedAt)
      if (dateCompare !== 0) return dateCompare

      return a.id.localeCompare(b.id)
    })
}

export function buildRadarItemId(sourceKey: string, externalId: string): string {
  return `${sourceKey}:${shortHash(normalizeKey(externalId))}`
}

export function buildContentHash(value: unknown): string {
  return shortHash(stableStringify(value), 16)
}

export function normalizeTitle(value: string): string {
  return normalizeSentence(value)
}

export function normalizeSentence(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase()
  if (!normalized) return ''

  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function normalizeList(values: string[]): string[] {
  return [...new Set(values.map(normalizeKey).filter(Boolean))].sort()
}

export function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) {
        url.searchParams.delete(key)
      }
    }
    url.hash = ''
    const normalized = url.toString()
    return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
  } catch {
    return trimmed
  }
}

export function normalizeDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid culinary radar date: ${value}`)
  }

  return date.toISOString()
}

function shortHash(value: string, length = 12): string {
  return createHash('sha256').update(value).digest('hex').slice(0, length)
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  )
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`
}

export function resolveSourceForItem(item: CulinaryRadarRawItem): CulinaryRadarSourceDefinition {
  return getSourceDefinition(item.sourceKey)
}
