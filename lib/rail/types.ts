// Rail Item Lifecycle Engine: shared types and constants

export type RailItemState =
  | 'surfaced'
  | 'seen'
  | 'acted'
  | 'snoozed'
  | 'resolved'
  | 'expired'
  | 'archived'

export type RailTier = 'critical' | 'action' | 'awareness' | 'opportunity'

export interface RailItem {
  id: string
  tenantId: string
  source: string
  tier: RailTier
  state: RailItemState
  score: number
  title: string
  subtitle?: string
  actionUrl?: string
  createdAt: Date
  surfacedAt: Date
  seenAt?: Date
  actedAt?: Date
  resolvedAt?: Date
  expiresAt?: Date
  ttlMinutes: number
  promotedFrom?: RailTier
  demotedFrom?: RailTier
  metadata: Record<string, unknown>
}

// --- Scoring ---

export interface ScoringFactors {
  baseScore: number
  urgencyMultiplier: number
  freshnessDecay: number
  userRelevance: number
}

// --- Density caps per tier ---

export const DENSITY_CAPS: Record<RailTier, number> = {
  critical: 3,
  action: 8,
  awareness: 12,
  opportunity: 6,
}

// --- Tier score thresholds ---

export const TIER_THRESHOLDS: { tier: RailTier; floor: number; ceiling: number }[] = [
  { tier: 'critical', floor: 80, ceiling: 100 },
  { tier: 'action', floor: 50, ceiling: 79 },
  { tier: 'awareness', floor: 20, ceiling: 49 },
  { tier: 'opportunity', floor: 0, ceiling: 19 },
]

// --- Time-of-day windows ---

export interface TimeWindow {
  start: number
  end: number
  dampingFactor: number
}

export const QUIET_HOURS: TimeWindow = { start: 22, end: 7, dampingFactor: 0.3 }
export const BUSINESS_HOURS: TimeWindow = { start: 9, end: 17, dampingFactor: 1.0 }
export const EVENING: TimeWindow = { start: 17, end: 22, dampingFactor: 0.7 }

// --- Canonical tier order ---

export const RAIL_TIER_ORDER: RailTier[] = ['critical', 'action', 'awareness', 'opportunity']

// --- Backward compatibility mapping ---

export function mapLegacyTier(legacyTier: string): RailTier {
  switch (legacyTier) {
    case 'p0':
      return 'critical'
    case 'p1':
      return 'action'
    case 'p2':
    case 'p3':
      return 'awareness'
    case 'p4':
      return 'opportunity'
    default:
      return 'awareness'
  }
}

// --- Tiered result container ---

export interface TieredResult<T> {
  critical: T[]
  action: T[]
  awareness: T[]
  opportunity: T[]
  totalItems: number
  assembledAt: string
}
