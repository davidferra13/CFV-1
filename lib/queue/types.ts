// Priority Queue - Type Definitions
// Pure types. No logic. No imports beyond database types.

// ============================================
// QUEUE DOMAINS
// ============================================

/**
 * Every queue item belongs to exactly one domain.
 * Domains map to the chef's mental model of their work.
 */
export type QueueDomain =
  | 'inquiry'
  | 'message'
  | 'quote'
  | 'event'
  | 'task'
  | 'financial'
  | 'post_event'
  | 'client'
  | 'culinary'
  | 'network'

/**
 * Urgency tiers for visual treatment and filtering.
 */
export type QueueUrgency =
  | 'critical' // Needs action NOW (event today, overdue payment)
  | 'high' // Should act today (expiring quote, approaching event)
  | 'normal' // Act this week
  | 'low' // Nice to do, no pressure

// ============================================
// QUEUE ITEM
// ============================================

/**
 * A single actionable item in the priority queue.
 * Every item across every domain is expressed as this type.
 */
export interface QueueItem {
  /** Deterministic ID: `${domain}:${entityType}:${entityId}:${actionKey}` */
  id: string

  /** Which domain this item belongs to */
  domain: QueueDomain

  /** Urgency tier (derived from score thresholds) */
  urgency: QueueUrgency

  /** Numeric priority score (higher = more urgent). Range: 0-1000 */
  score: number

  /** Short action title: "Respond to inquiry", "File AAR" */
  title: string

  /** Why this matters right now */
  description: string

  /** Deep link to resolve this item */
  href: string

  /** Lucide icon name for visual */
  icon: string

  /** Entity context for display */
  context: {
    /** Primary label (client name, event occasion, etc.) */
    primaryLabel: string
    /** Secondary label (date, status, etc.) */
    secondaryLabel?: string
    /** Amount in cents, if money-related */
    amountCents?: number
  }

  /** When this item was created/became relevant */
  createdAt: string

  /** When this item must be resolved by (null = no hard deadline) */
  dueAt: string | null

  /** If this item blocks other work, describe what */
  blocks?: string

  /** Original entity ID for deduplication */
  entityId: string

  /** Original entity type for grouping */
  entityType: string

  /** Inline action (allows completing from dashboard without navigation) */
  inlineAction?: InlineAction

  /** Estimated minutes to complete this action */
  estimatedMinutes?: number

  /** Business context explaining why this matters */
  contextLine?: string
}

// ============================================
// INLINE ACTIONS (Zero-Navigation Completions)
// ============================================

export type InlineActionType =
  | 'respond_inquiry'
  | 'send_followup'
  | 'record_payment'
  | 'send_message'
  | 'log_expense'

export interface InlineAction {
  type: InlineActionType
  prefill: Record<string, string>
}

// ============================================
// SCORING INPUTS
// ============================================

/**
 * Raw attributes fed into the scoring function.
 * Each provider converts domain data into these universal attributes.
 */
export interface ScoreInputs {
  /** Hours until this needs to happen. Negative = overdue. null = no deadline. */
  hoursUntilDue: number | null

  /** Business impact weight: 0 (trivial) to 1.0 (critical) */
  impactWeight: number

  /** Does this item block downstream work? */
  isBlocking: boolean

  /** Hours since this item became relevant (staleness) */
  hoursSinceCreated: number

  /** Revenue at stake in cents (0 if none) */
  revenueCents: number

  /** Is this a time-sensitive window that closes? */
  isExpiring: boolean
}

// ============================================
// QUEUE OUTPUT
// ============================================

/**
 * The complete queue state, ready for rendering.
 */
export interface PriorityQueue {
  /** All items sorted by score descending */
  items: QueueItem[]

  /** The single most important item (items[0] or null) */
  nextAction: QueueItem | null

  /** Summary stats */
  summary: QueueSummary

  /** When this queue was computed */
  computedAt: string
}

export interface QueueSummary {
  totalItems: number
  byDomain: Record<QueueDomain, number>
  byUrgency: Record<QueueUrgency, number>
  /** True if totalItems === 0 */
  allCaughtUp: boolean
}
