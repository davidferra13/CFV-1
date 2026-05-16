/**
 * Rail Item Lifecycle & Scoring Engine - Shared Types
 *
 * Canonical types for the unified rail item model consumed by both
 * Dashboard Rail and Discovery Rail. Defines lifecycle states,
 * tier thresholds, density caps, and time-awareness windows.
 */

// ---------------------------------------------------------------------------
// Lifecycle states
// ---------------------------------------------------------------------------

export type RailItemState =
  | 'surfaced'
  | 'seen'
  | 'acted'
  | 'snoozed'
  | 'resolved'
  | 'expired'
  | 'archived'

// ---------------------------------------------------------------------------
// Tier system (matches rail-tier-assigner UnifiedTier)
// ---------------------------------------------------------------------------

export type RailItemTier = 'critical' | 'action' | 'awareness' | 'opportunity'

export const RAIL_ITEM_TIER_ORDER: RailItemTier[] = [
  'critical',
  'action',
  'awareness',
  'opportunity',
]

// ---------------------------------------------------------------------------
// Tier score thresholds
// ---------------------------------------------------------------------------

export interface TierThreshold {
  floor: number
  ceiling: number
}

export const TIER_THRESHOLDS: Record<RailItemTier, TierThreshold> = {
  critical: { floor: 80, ceiling: 100 },
  action: { floor: 50, ceiling: 79 },
  awareness: { floor: 20, ceiling: 49 },
  opportunity: { floor: 0, ceiling: 19 },
}

// ---------------------------------------------------------------------------
// Density caps per tier
// ---------------------------------------------------------------------------

export interface DensityCap {
  maxVisible: number
  overflowBehavior: 'badge' | 'scroll_last_card' | 'truncate'
}

export const DENSITY_CAPS: Record<RailItemTier, DensityCap> = {
  critical: { maxVisible: 3, overflowBehavior: 'badge' },
  action: { maxVisible: 8, overflowBehavior: 'scroll_last_card' },
  awareness: { maxVisible: 12, overflowBehavior: 'truncate' },
  opportunity: { maxVisible: 6, overflowBehavior: 'truncate' },
}

// ---------------------------------------------------------------------------
// Time-of-day windows
// ---------------------------------------------------------------------------

export type TimeWindow = 'morning' | 'active' | 'evening' | 'night'

export interface TimeWindowConfig {
  startHour: number
  endHour: number
  criticalActionMultiplier: number
  awarenessOpportunityMultiplier: number
}

export const TIME_WINDOWS: Record<TimeWindow, TimeWindowConfig> = {
  morning: {
    startHour: 5,
    endHour: 9,
    criticalActionMultiplier: 1.2,
    awarenessOpportunityMultiplier: 1.0,
  },
  active: {
    startHour: 9,
    endHour: 17,
    criticalActionMultiplier: 1.0,
    awarenessOpportunityMultiplier: 1.0,
  },
  evening: {
    startHour: 17,
    endHour: 22,
    criticalActionMultiplier: 1.0,
    awarenessOpportunityMultiplier: 0.7,
  },
  night: {
    startHour: 22,
    endHour: 5,
    criticalActionMultiplier: 1.0,
    awarenessOpportunityMultiplier: 0.0,
  },
}

// ---------------------------------------------------------------------------
// Source systems
// ---------------------------------------------------------------------------

export type RailItemSource =
  | 'lifecycle'
  | 'cil'
  | 'pie'
  | 'remy'
  | 'discovery'
  | 'event_fsm'
  | 'communication'
  | 'finance'
  | 'onboarding'
  | 'staff'

// ---------------------------------------------------------------------------
// Core RailItem interface
// ---------------------------------------------------------------------------

export interface RailItem {
  id: string
  tenantId: string
  source: RailItemSource
  tier: RailItemTier
  state: RailItemState
  score: number // 0-100, determines position within tier
  title: string
  subtitle?: string
  actionUrl?: string
  createdAt: Date
  surfacedAt: Date
  seenAt?: Date
  actedAt?: Date
  resolvedAt?: Date
  expiresAt?: Date // hard TTL; auto-expires if unresolved
  ttlMinutes: number // soft TTL; score decays toward 0 over this window
  snoozedUntil?: Date
  promotedFrom?: RailItemTier // tracks tier movement
  demotedFrom?: RailItemTier
  metadata: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Scoring input (what source adapters provide)
// ---------------------------------------------------------------------------

export interface RailItemScoringInput {
  baseScore: number // 0-100 from source system
  expiresAt?: Date
  ttlMinutes: number
  interactionCount: number // how many times user has interacted
  dismissCount: number // how many times user dismissed similar items
  source: RailItemSource
}

// ---------------------------------------------------------------------------
// Scoring breakdown (for debugging/transparency)
// ---------------------------------------------------------------------------

export interface RailItemScoreBreakdown {
  baseScore: number
  urgencyMultiplier: number
  freshnessDecay: number
  userRelevance: number
  timeWindowMultiplier: number
  finalScore: number
  tier: RailItemTier
}

// ---------------------------------------------------------------------------
// Cross-rail signal (Discovery -> Dashboard)
// ---------------------------------------------------------------------------

export interface CrossRailSignal {
  discoveryEvent: string
  dashboardTitle: string
  dashboardSubtitle?: string
  baseScore: number // always 10-19 for Opportunity tier
  source: 'discovery'
  metadata: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// State transition definition
// ---------------------------------------------------------------------------

export interface RailItemTransition {
  from: RailItemState
  to: RailItemState
  trigger: string
}

export const VALID_TRANSITIONS: RailItemTransition[] = [
  { from: 'surfaced', to: 'seen', trigger: 'viewport_dwell_2s' },
  { from: 'surfaced', to: 'expired', trigger: 'ttl_expired' },
  { from: 'seen', to: 'acted', trigger: 'user_click_action' },
  { from: 'seen', to: 'snoozed', trigger: 'user_snooze' },
  { from: 'seen', to: 'expired', trigger: 'ttl_expired' },
  { from: 'snoozed', to: 'surfaced', trigger: 'snooze_timer_expired' },
  { from: 'acted', to: 'resolved', trigger: 'source_confirms_completion' },
  { from: 'acted', to: 'expired', trigger: 'ttl_expired' },
  { from: 'expired', to: 'archived', trigger: 'grace_period_5min' },
  { from: 'resolved', to: 'archived', trigger: 'grace_period_5min' },
]
