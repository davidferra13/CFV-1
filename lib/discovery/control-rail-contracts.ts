import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

export type DiscoveryRailSlotKind =
  | 'practical'
  | 'ambient'
  | 'editorial'
  | 'promotional'
  | 'planned'

export type DiscoveryRailAssemblyItem = DiscoveryRailItem & {
  slotKind?: DiscoveryRailSlotKind
  userRelevant?: boolean
}

export type DiscoveryRailImpression = {
  key: string
  lastSeenAt: string | number | Date
}

export type DiscoveryRailAssemblyOptions = {
  now?: string | number | Date
  cooldownMs?: number
  seed?: string
  targetCount?: number
  manualShuffle?: boolean
  hiddenKeys?: string[]
  dismissedKeys?: string[]
  savedKeys?: string[]
  pinnedKeys?: string[]
  impressions?: DiscoveryRailImpression[] | Record<string, string | number | Date>
  ambientCapRatio?: number
}

export type DiscoveryRailSlotPolicyReport = {
  practicalRatio: number
  nonPracticalCount: number
  practicalCount: number
  violations: string[]
  passed: boolean
}

export type DiscoveryRailMotionControl = 'passive' | 'flick' | 'dice' | 'lever'

export type DiscoveryRailMotionContract = {
  control: DiscoveryRailMotionControl
  preservesMomentum: boolean
  rolling: boolean
  shouldResetScrollStart: boolean
  protectsActivation: boolean
  autoStopMs: number | null
  rowStopMode: 'none' | 'staggered' | 'manual_top_to_bottom'
  animation: 'none' | 'momentum' | 'short_roll' | 'instant_offset'
}

const DEFAULT_COOLDOWN_MS = 4 * 60 * 60 * 1000
const PRACTICAL_TYPES = new Set<DiscoveryRailItem['type']>([
  'cuisine',
  'food_type',
  'craving',
  'service',
  'occasion',
  'dietary',
  'combo',
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
])

export function assembleDiscoveryRailItems<T extends DiscoveryRailAssemblyItem>(
  items: readonly T[],
  options: DiscoveryRailAssemblyOptions = {}
): T[] {
  const nowMs = toTime(options.now ?? Date.now())
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS
  const targetCount = options.targetCount ?? items.length
  const hidden = new Set([...(options.hiddenKeys ?? []), ...(options.dismissedKeys ?? [])])
  const saved = new Set(options.savedKeys ?? [])
  const pinned = new Set(options.pinnedKeys ?? [])
  const impressions = normalizeImpressions(options.impressions)

  const available = items.filter((item) => !hidden.has(normalizeDiscoveryRailCooldownKey(item)))
  const eligible = available.filter((item) => {
    const key = normalizeDiscoveryRailCooldownKey(item)
    if (options.manualShuffle || saved.has(key) || pinned.has(key)) return true
    return !isDiscoveryRailItemOnCooldown(item, impressions, nowMs, cooldownMs)
  })

  const pool = eligible.length >= Math.min(targetCount, available.length) ? eligible : available
  const ordered = [...pool].sort((a, b) => {
    const aKey = normalizeDiscoveryRailCooldownKey(a)
    const bKey = normalizeDiscoveryRailCooldownKey(b)
    return (
      priorityFor(a, aKey, saved, pinned) - priorityFor(b, bKey, saved, pinned) ||
      seededRank(aKey, options.seed ?? 'default') - seededRank(bKey, options.seed ?? 'default')
    )
  })

  return enforceSlotPolicy(ordered, options.ambientCapRatio ?? 0.2).slice(0, targetCount)
}

export function normalizeDiscoveryRailCooldownKey(
  item: Pick<DiscoveryRailItem, 'type' | 'href' | 'label'>
): string {
  const hrefKey = normalizeHref(item.href)
  const fallback = normalizeText(item.label)
  return `${item.type}:${hrefKey || fallback}`
}

export function isDiscoveryRailItemOnCooldown(
  item: Pick<DiscoveryRailItem, 'type' | 'href' | 'label'>,
  impressions:
    | readonly DiscoveryRailImpression[]
    | Record<string, string | number | Date>
    | Map<string, number> = [],
  now: string | number | Date = Date.now(),
  cooldownMs = DEFAULT_COOLDOWN_MS
): boolean {
  const key = normalizeDiscoveryRailCooldownKey(item)
  const normalized = normalizeImpressions(impressions)
  const lastSeen = normalized.get(key)
  return lastSeen !== undefined && toTime(now) - lastSeen < cooldownMs
}

export function evaluateDiscoveryRailSlotPolicy(
  items: readonly DiscoveryRailAssemblyItem[],
  ambientCapRatio = 0.2
): DiscoveryRailSlotPolicyReport {
  const nonPracticalCount = items.filter(
    (item) => classifyDiscoveryRailSlot(item) !== 'practical'
  ).length
  const practicalCount = items.length - nonPracticalCount
  const practicalRatio = items.length === 0 ? 1 : practicalCount / items.length
  const violations: string[] = []

  if (practicalRatio < 1 - ambientCapRatio) violations.push('practical-ratio-below-policy')
  if (items[0] && classifyDiscoveryRailSlot(items[0]) !== 'practical' && !items[0].userRelevant) {
    violations.push('first-slot-not-practical')
  }
  for (let index = 1; index < items.length; index += 1) {
    if (
      classifyDiscoveryRailSlot(items[index]) !== 'practical' &&
      classifyDiscoveryRailSlot(items[index - 1]) !== 'practical'
    ) {
      violations.push('adjacent-non-practical-slots')
      break
    }
  }

  return {
    practicalRatio: round(practicalRatio),
    nonPracticalCount,
    practicalCount,
    violations,
    passed: violations.length === 0,
  }
}

export function classifyDiscoveryRailSlot(item: DiscoveryRailAssemblyItem): DiscoveryRailSlotKind {
  if (item.slotKind) return item.slotKind
  if (PRACTICAL_TYPES.has(item.type)) return 'practical'
  if (item.type === 'featured_chef' || item.type === 'chef_pick') return 'editorial'
  if (item.type === 'story') return 'ambient'
  return 'ambient'
}

export function resolveDiscoveryRailMotionContract(input: {
  control: DiscoveryRailMotionControl
  reducedMotion?: boolean
  pointerVelocityPxPerMs?: number
}): DiscoveryRailMotionContract {
  const reducedMotion = input.reducedMotion === true
  if (input.control === 'passive') {
    return {
      control: input.control,
      preservesMomentum: false,
      rolling: false,
      shouldResetScrollStart: false,
      protectsActivation: false,
      autoStopMs: null,
      rowStopMode: 'none',
      animation: 'none',
    }
  }

  if (input.control === 'flick') {
    const fast = Math.abs(input.pointerVelocityPxPerMs ?? 0) >= 0.8
    return {
      control: input.control,
      preservesMomentum: fast,
      rolling: false,
      shouldResetScrollStart: false,
      protectsActivation: fast,
      autoStopMs: fast ? 900 : null,
      rowStopMode: 'none',
      animation: reducedMotion ? 'none' : 'momentum',
    }
  }

  return {
    control: input.control,
    preservesMomentum: false,
    rolling: !reducedMotion,
    shouldResetScrollStart: input.control === 'dice',
    protectsActivation: true,
    autoStopMs: input.control === 'dice' ? (reducedMotion ? 0 : 1400) : 4500,
    rowStopMode: input.control === 'dice' ? 'staggered' : 'manual_top_to_bottom',
    animation: reducedMotion ? 'instant_offset' : 'short_roll',
  }
}

function enforceSlotPolicy<T extends DiscoveryRailAssemblyItem>(
  items: T[],
  ambientCapRatio: number
): T[] {
  const practical = items.filter((item) => classifyDiscoveryRailSlot(item) === 'practical')
  const nonPractical = items.filter((item) => classifyDiscoveryRailSlot(item) !== 'practical')
  const maxNonPractical = Math.floor(items.length * ambientCapRatio)
  const cappedNonPractical = nonPractical.slice(0, maxNonPractical)
  const result: T[] = []
  let practicalIndex = 0
  let nonPracticalIndex = 0

  while (practicalIndex < practical.length || nonPracticalIndex < cappedNonPractical.length) {
    if (practicalIndex < practical.length) result.push(practical[practicalIndex++])
    const canInsertNonPractical =
      nonPracticalIndex < cappedNonPractical.length &&
      result.length > 0 &&
      classifyDiscoveryRailSlot(result[result.length - 1]) === 'practical' &&
      practicalIndex % 4 === 0
    if (canInsertNonPractical) result.push(cappedNonPractical[nonPracticalIndex++])
  }

  return result
}

function priorityFor<T extends DiscoveryRailAssemblyItem>(
  item: T,
  key: string,
  saved: Set<string>,
  pinned: Set<string>
): number {
  if (pinned.has(key)) return 0
  if (saved.has(key) || item.type === 'saved') return 1
  if (classifyDiscoveryRailSlot(item) === 'practical') return 2
  if (item.userRelevant) return 3
  return 4
}

function normalizeImpressions(
  impressions:
    | readonly DiscoveryRailImpression[]
    | Record<string, string | number | Date>
    | Map<string, number> = []
): Map<string, number> {
  if (impressions instanceof Map) return impressions
  if (Array.isArray(impressions)) {
    return new Map(impressions.map((entry) => [entry.key, toTime(entry.lastSeenAt)]))
  }
  return new Map(Object.entries(impressions).map(([key, value]) => [key, toTime(value)]))
}

function normalizeHref(href: string): string {
  try {
    const url = new URL(href, 'https://chef.test')
    const params = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b))
    const query = new URLSearchParams(params).toString()
    return `${url.pathname}${query ? `?${query}` : ''}`.toLowerCase()
  } catch {
    return href.trim().toLowerCase()
  }
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

function seededRank(value: string, seed: string): number {
  let hash = 2166136261
  const input = `${seed}:${value}`
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function toTime(value: string | number | Date): number {
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  return new Date(value).getTime()
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
