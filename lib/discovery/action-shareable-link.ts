import type { ConsumerDiscoveryFilters } from '@/lib/public-consumer/discovery-actions'

export type ShareableDiscoveryMode = 'browse' | 'compare' | 'shortlist' | 'plan'

export type ShareableDiscoveryState = {
  mode?: ShareableDiscoveryMode
  filters?: ConsumerDiscoveryFilters
  selectedIds?: readonly string[]
  shortlistIds?: readonly string[]
  compareIds?: readonly string[]
}

const FILTER_KEYS = [
  'intent',
  'craving',
  'fulfillment',
  'location',
  'budget',
  'dietary',
  'dateWindow',
  'eventStyle',
  'useCase',
] as const

export function buildShareableDiscoveryLink(
  basePath: string,
  state: ShareableDiscoveryState
): string {
  const url = new URL(basePath, 'https://chef.test')
  const params = url.searchParams
  const filters = state.filters ?? {}

  for (const key of FILTER_KEYS) {
    const value = filters[key]
    if (typeof value === 'string' && value.trim()) params.set(key, value.trim())
  }
  if (typeof filters.partySize === 'number' && filters.partySize > 0) {
    params.set('partySize', String(Math.floor(filters.partySize)))
  }
  if (filters.visualMode) params.set('visualMode', '1')
  if (state.mode) params.set('mode', state.mode)
  setIdList(params, 'sel', state.selectedIds)
  setIdList(params, 'sl', state.shortlistIds)
  setIdList(params, 'cmp', state.compareIds)

  return `${url.pathname}${params.toString() ? `?${params.toString()}` : ''}`
}

export function parseShareableDiscoveryLink(href: string): ShareableDiscoveryState {
  const url = new URL(href, 'https://chef.test')
  const params = url.searchParams
  const filters: ConsumerDiscoveryFilters = {}

  for (const key of FILTER_KEYS) {
    const value = params.get(key)
    if (value) {
      ;(filters as Record<string, string>)[key] = value
    }
  }

  const partySize = Number(params.get('partySize'))
  if (Number.isFinite(partySize) && partySize > 0) filters.partySize = Math.floor(partySize)
  if (params.get('visualMode') === '1') filters.visualMode = true

  const mode = params.get('mode')

  return {
    ...(isShareableDiscoveryMode(mode) ? { mode } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    selectedIds: getIdList(params, 'sel'),
    shortlistIds: getIdList(params, 'sl'),
    compareIds: getIdList(params, 'cmp'),
  }
}

export function isShareableDiscoveryMode(value: unknown): value is ShareableDiscoveryMode {
  return value === 'browse' || value === 'compare' || value === 'shortlist' || value === 'plan'
}

function setIdList(params: URLSearchParams, key: string, ids: readonly string[] | undefined) {
  const normalized = normalizeIds(ids)
  if (normalized.length > 0) params.set(key, normalized.join(','))
}

function getIdList(params: URLSearchParams, key: string): string[] {
  return normalizeIds(params.get(key)?.split(',') ?? [])
}

function normalizeIds(ids: readonly string[] | undefined): string[] {
  if (!ids) return []
  return Array.from(
    new Set(ids.map((id) => id.trim()).filter((id) => id && id.length <= 120))
  ).slice(0, 20)
}
