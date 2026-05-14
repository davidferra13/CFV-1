import type { DiscoveryItemType } from '@/lib/discovery/persistent-profile'
import type { ConsumerResultType } from '@/lib/public-consumer/discovery-actions'

export type DiscoveryShortlistItemKind =
  | ConsumerResultType
  | DiscoveryItemType
  | 'restaurant'
  | 'recipe'
  | 'remy_note'
  | 'manual_pick'

export type DiscoveryShortlistSource = 'rail' | 'saved' | 'search' | 'remy' | 'circle' | 'manual'

export type DiscoveryShortlistItem = {
  id: string
  kind: DiscoveryShortlistItemKind
  label: string
  href?: string | null
  source: DiscoveryShortlistSource
  note?: string | null
  addedAt: string
  ownerId?: string | null
  durable?: boolean
}

export type DiscoveryShortlistState = {
  items: readonly DiscoveryShortlistItem[]
  circleId?: string | null
  maxItems?: number
}

export type DiscoveryShortlistSummary = {
  total: number
  durableCount: number
  compareReady: boolean
  sendToCircleReady: boolean
  byKind: Record<string, number>
}

export function createShortlistItem(
  input: Omit<DiscoveryShortlistItem, 'id' | 'addedAt'> & {
    id?: string
    addedAt?: string
  }
): DiscoveryShortlistItem {
  const label = input.label.trim()
  if (!label) throw new Error('Shortlist item label is required.')
  const id = input.id?.trim() || `${input.kind}:${slugify(label)}`

  return {
    id,
    kind: input.kind,
    label,
    href: input.href ?? null,
    source: input.source,
    note: input.note ?? null,
    addedAt: input.addedAt ?? new Date(0).toISOString(),
    ownerId: input.ownerId ?? null,
    durable: input.durable ?? (input.source === 'saved' || input.source === 'circle'),
  }
}

export function upsertShortlistItem(
  state: DiscoveryShortlistState,
  item: DiscoveryShortlistItem
): DiscoveryShortlistState {
  const maxItems = state.maxItems ?? 12
  const existingIndex = state.items.findIndex((entry) => entry.id === item.id)
  const items =
    existingIndex >= 0
      ? state.items.map((entry, index) => (index === existingIndex ? { ...entry, ...item } : entry))
      : [item, ...state.items]

  return {
    ...state,
    items: items.slice(0, maxItems),
  }
}

export function removeShortlistItem(
  state: DiscoveryShortlistState,
  itemId: string
): DiscoveryShortlistState {
  return {
    ...state,
    items: state.items.filter((item) => item.id !== itemId),
  }
}

export function summarizeShortlist(state: DiscoveryShortlistState): DiscoveryShortlistSummary {
  const byKind: Record<string, number> = {}
  for (const item of state.items) {
    byKind[item.kind] = (byKind[item.kind] ?? 0) + 1
  }

  return {
    total: state.items.length,
    durableCount: state.items.filter((item) => item.durable).length,
    compareReady: state.items.length >= 2,
    sendToCircleReady: Boolean(state.circleId && state.items.length > 0),
    byKind,
  }
}

export function getCompareCandidateIdsFromShortlist(state: DiscoveryShortlistState): string[] {
  return state.items
    .filter((item) => item.kind !== 'remy_note')
    .map((item) => item.id)
    .slice(0, 4)
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
