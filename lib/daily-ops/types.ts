// Daily Ops - Type Definitions
// Pure types for the Daily Plan system.
// No logic. No imports beyond what's needed for typing.

// ============================================
// PLAN LANES
// ============================================

/**
 * The 4 swim lanes that organize a chef's day.
 * Order matters: quick_admin first (clear the deck),
 * event_prep second (time-sensitive), creative third
 * (deep work), relationship last (when energy allows).
 */
export type PlanLane = 'quick_admin' | 'event_prep' | 'creative' | 'relationship'

/**
 * Which system generated this item.
 * Used for delegation when completing/dismissing.
 */
export type PlanItemSource =
  | 'queue'
  | 'dop'
  | 'briefing'
  | 'nba'
  | 'todo'
  | 'recipe_debt'
  | 'follow_up'
  | 'call'

// ============================================
// PLAN ITEMS
// ============================================

/**
 * An auto-drafted communication ready for one-tap approval.
 * Pro tier only.
 */
export interface PlanItemDraft {
  draftId: string
  draftType: 'follow_up' | 'confirmation' | 'birthday' | 'reminder'
  previewText: string
  recipientName: string
}

/**
 * A single actionable item in the daily plan.
 */
export interface PlanItem {
  /** Deterministic key: `${sourceSystem}:${sourceId}` */
  id: string

  /** Which swim lane this belongs to */
  lane: PlanLane

  /** Short action title */
  title: string

  /** Why this matters / additional context */
  description: string

  /** Deep link to resolve this item */
  href: string

  /** Rough time estimate in minutes */
  timeEstimateMinutes: number

  /** Priority within the lane (1 = highest) */
  priority: number

  /** Which system generated this item */
  sourceSystem: PlanItemSource

  /** Original entity ID from the source system */
  sourceId: string

  /** If Remy pre-drafted something (Pro only) */
  draft?: PlanItemDraft

  /** Whether this item has been completed today */
  completed: boolean

  /** Whether this item was dismissed today */
  dismissed: boolean

  /** Optional: event context for prep items */
  eventContext?: {
    eventId: string
    occasion: string | null
    eventDate: string
    clientName: string
  }
}

// ============================================
// PLAN LANES (rendered)
// ============================================

export interface PlanLaneData {
  lane: PlanLane
  label: string
  icon: string
  items: PlanItem[]
  totalTimeMinutes: number
  completedCount: number
}

// ============================================
// DAILY PLAN
// ============================================

/**
 * The complete daily plan, ready for rendering.
 */
export interface DailyPlan {
  /** Date this plan covers (ISO 8601 date string) */
  planDate: string

  /** The 4 swim lanes with their items */
  lanes: PlanLaneData[]

  /** Remy's conversational summary for the top of the page */
  remySummary: string

  /** Quick stats for the dashboard banner */
  stats: {
    totalItems: number
    completedItems: number
    adminItems: number
    prepItems: number
    creativeItems: number
    relationshipItems: number
    estimatedMinutes: number
  }

  /** Today's schedule context (events happening today) */
  todayEvents: {
    id: string
    occasion: string | null
    clientName: string
    serveTime: string
    guestCount: number
  }[]

  /** Protected time blocks for today */
  protectedTime: {
    title: string
    startDate: string
    endDate: string
    blockType: string
  }[]

  /** When this plan was computed */
  computedAt: string
}
