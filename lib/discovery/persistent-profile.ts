import {
  normalizePreferenceToken,
  type RankedDiscoveryPreference,
} from '@/lib/discovery/discovery-preference-ranking'

export const DISCOVERY_ITEM_TYPES = [
  'cuisine',
  'food_type',
  'craving',
  'service',
  'occasion',
  'dietary',
  'featured_chef',
  'chef_pick',
  'combo',
  'story',
  'surprise',
  'seasonal',
  'location',
  'mood',
  'price',
  'time',
  'group_size',
  'saved',
  'special_dining',
  'circle',
  'culinary_signal',
] as const

export const DISCOVERY_ACTIONS = [
  'impression',
  'ignore',
  'click',
  'love',
  'hate',
  'hide',
  'save',
  'pin',
  'unpin',
  'dismiss',
  'undismiss',
  'long_dwell',
  'quick_back',
  'search_submit',
  'inquiry_started',
  'inquiry_submitted',
  'book',
  'booking',
] as const

export const DISCOVERY_ROW_ROLES = ['cuisine', 'mobile', 'craving', 'intent'] as const

export type DiscoveryItemType = (typeof DISCOVERY_ITEM_TYPES)[number]
export type DiscoveryAction = (typeof DISCOVERY_ACTIONS)[number]
export type DiscoveryRowRole = (typeof DISCOVERY_ROW_ROLES)[number]

export type DiscoveryProfileItem = {
  itemType: DiscoveryItemType
  itemValue: string
  itemLabel: string | null
  href: string | null
  pinned: boolean
  dismissed: boolean
  liked: boolean
  disliked: boolean
  metadata: Record<string, unknown> | null
  createdAt: string | null
  updatedAt: string | null
  lastInteractedAt: string | null
}

export type DiscoveryRecentItem = {
  itemType: DiscoveryItemType
  itemValue: string
  itemLabel: string | null
  href: string | null
  action: string | null
  metadata: Record<string, unknown> | null
  interactedAt: string | null
}

export type DiscoveryProfileState = {
  pinned: DiscoveryProfileItem[]
  dismissed: DiscoveryProfileItem[]
  liked: DiscoveryProfileItem[]
  disliked: DiscoveryProfileItem[]
  recent: DiscoveryRecentItem[]
  preferences: RankedDiscoveryPreference[]
}

export type SanitizedDiscoveryItemPayload = {
  itemType: DiscoveryItemType
  itemValue: string
  itemLabel: string | null
  href: string | null
  metadata: Record<string, unknown> | null
}

const VALID_ITEM_TYPES = new Set<string>(DISCOVERY_ITEM_TYPES)
const VALID_ACTIONS = new Set<string>(DISCOVERY_ACTIONS)
const VALID_ROW_ROLES = new Set<string>(DISCOVERY_ROW_ROLES)

const MAX_VALUE_LEN = 100
const MAX_LABEL_LEN = 100
const MAX_HREF_LEN = 500
const MAX_METADATA_KEY_LEN = 64
const MAX_METADATA_STRING_LEN = 300
const MAX_METADATA_BYTES = 4000
const MAX_METADATA_DEPTH = 3
const MAX_METADATA_KEYS = 32
const MAX_METADATA_ARRAY_ITEMS = 20
const BLOCKED_METADATA_KEYS = new Set(['anonymous_id', 'anonymousId'])

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export function isDiscoveryItemType(value: unknown): value is DiscoveryItemType {
  return typeof value === 'string' && VALID_ITEM_TYPES.has(value)
}

export function isDiscoveryAction(value: unknown): value is DiscoveryAction {
  return typeof value === 'string' && VALID_ACTIONS.has(value)
}

export function isDiscoveryRowRole(value: unknown): value is DiscoveryRowRole {
  return typeof value === 'string' && VALID_ROW_ROLES.has(value)
}

export function sanitizeDiscoveryAction(
  value: unknown,
  fallback: DiscoveryAction
): DiscoveryAction {
  return isDiscoveryAction(value) ? value : fallback
}

export function sanitizeDiscoveryItemPayload(
  input: Record<string, unknown>
): SanitizedDiscoveryItemPayload | null {
  const itemType = coalesce(input.item_type, input.itemType, input.type)
  const itemValue = coalesce(input.item_value, input.itemValue, input.value)

  if (!isDiscoveryItemType(itemType)) return null
  if (typeof itemValue !== 'string' || !itemValue.trim()) return null

  const itemLabel = coalesce(input.item_label, input.itemLabel, input.label)
  const href = coalesce(input.href, input.url)

  return {
    itemType,
    itemValue: itemValue.trim().slice(0, MAX_VALUE_LEN),
    itemLabel: typeof itemLabel === 'string' ? itemLabel.trim().slice(0, MAX_LABEL_LEN) : null,
    href: typeof href === 'string' ? href.trim().slice(0, MAX_HREF_LEN) : null,
    metadata: toBoundedMetadata(
      firstPlainObject(input.metadata, input.event_context, input.context)
    ),
  }
}

export function getDiscoveryProfileMutation(action: DiscoveryAction): {
  pinned?: boolean
  dismissed?: boolean
  liked?: boolean
  disliked?: boolean
} | null {
  switch (action) {
    case 'save':
    case 'pin':
      return { pinned: true, dismissed: false }
    case 'unpin':
      return { pinned: false }
    case 'hide':
    case 'dismiss':
      return { dismissed: true, pinned: false }
    case 'undismiss':
      return { dismissed: false }
    case 'love':
      return { liked: true, disliked: false, dismissed: false }
    case 'hate':
      return { disliked: true, liked: false, dismissed: true, pinned: false }
    default:
      return null
  }
}

export function normalizeDiscoveryProfileRows(rows: unknown[]): DiscoveryProfileState {
  const items: DiscoveryProfileItem[] = []
  for (const row of rows) {
    if (!isPlainObject(row)) continue
    const item = rowToProfileItem(row)
    if (item) items.push(item)
  }
  const pinned = items.filter((item) => item.pinned)
  const dismissed = items.filter((item) => item.dismissed)
  const liked = items.filter((item) => item.liked)
  const disliked = items.filter((item) => item.disliked)

  return {
    pinned,
    dismissed,
    liked,
    disliked,
    recent: [],
    preferences: [],
  }
}

export function isMissingDiscoveryStorageError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : ''

  return (
    code === '42P01' ||
    code === '42703' ||
    message.includes('discovery_interactions') ||
    message.includes('discovery_profile_items') ||
    message.includes('does not exist')
  )
}

export function normalizeDiscoveryToken(value: string | null | undefined): string {
  return normalizePreferenceToken(value)
}

function rowToProfileItem(row: Record<string, unknown>): DiscoveryProfileItem | null {
  const itemType = row.item_type
  const itemValue = row.item_value
  if (!isDiscoveryItemType(itemType) || typeof itemValue !== 'string') return null

  return {
    itemType,
    itemValue,
    itemLabel: typeof row.item_label === 'string' ? row.item_label : null,
    href: typeof row.href === 'string' ? row.href : null,
    pinned: row.pinned === true,
    dismissed: row.dismissed === true,
    liked: row.liked === true,
    disliked: row.disliked === true,
    metadata: isPlainObject(row.metadata) ? row.metadata : null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    lastInteractedAt: toIsoString(row.last_interacted_at),
  }
}

function coalesce(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null)
}

function firstPlainObject(...values: unknown[]): Record<string, unknown> | null {
  for (const value of values) {
    if (isPlainObject(value) && Object.keys(value).length > 0) return value
  }

  return null
}

function toBoundedMetadata(value: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!value) return null

  const sanitized = sanitizeJsonValue(value, 0)
  if (!isPlainObject(sanitized)) return null

  const json = JSON.stringify(sanitized)
  if (new TextEncoder().encode(json).length <= MAX_METADATA_BYTES) {
    return sanitized as Record<string, unknown>
  }

  return { truncated: true }
}

function sanitizeJsonValue(value: unknown, depth: number): JsonValue | undefined {
  if (value === null) return null
  if (typeof value === 'string') return value.slice(0, MAX_METADATA_STRING_LEN)
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (depth >= MAX_METADATA_DEPTH) return undefined

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_METADATA_ARRAY_ITEMS)
      .map((item) => sanitizeJsonValue(item, depth + 1))
      .filter((item): item is JsonValue => item !== undefined)

    return items
  }

  if (isPlainObject(value)) {
    const sanitized: Record<string, JsonValue> = {}
    const entries = Object.entries(value).slice(0, MAX_METADATA_KEYS)

    for (const [key, entryValue] of entries) {
      const safeKey = key.slice(0, MAX_METADATA_KEY_LEN)
      if (!safeKey || BLOCKED_METADATA_KEYS.has(key) || BLOCKED_METADATA_KEYS.has(safeKey)) {
        continue
      }

      const safeValue = sanitizeJsonValue(entryValue, depth + 1)
      if (safeValue !== undefined) sanitized[safeKey] = safeValue
    }

    return sanitized
  }

  return undefined
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toIsoString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return null
}
