// Preparable Work Engine - Type Definitions
// Pure types. No logic. No imports beyond database types.

import type { Database } from '@/types/database'

type EventStatus = Database['public']['Enums']['event_status']
type PaymentStatus = Database['public']['Enums']['payment_status']

// ============================================
// CONFIRMED FACTS
// ============================================

/**
 * Facts derived from event data and related records.
 * Every field is a boolean — either the fact is confirmed or it is not.
 * The engine never guesses. Unknown = false.
 */
export interface ConfirmedFacts {
  // Stage 1 — Inquiry Intake
  hasClient: boolean
  hasOccasion: boolean
  hasDate: boolean
  hasLocation: boolean
  hasGuestCount: boolean

  // Stage 2 — Qualification
  hasServeTimeWindow: boolean   // serve_time is set
  hasMenuDirection: boolean     // at least one menu attached

  // Stage 3 — Menu Development
  hasMenuAttached: boolean      // menus linked via menus.event_id
  hasMenuWithDishes: boolean    // attached menu has dishes (relational)
  menuGravityStable: boolean    // status >= proposed (menu shape unlikely to change)

  // Stage 4 — Quote
  hasPricing: boolean           // quoted_price_cents > 0
  hasDepositDefined: boolean    // deposit_amount_cents > 0

  // Stage 5 — Financial Commitment
  depositReceived: boolean      // payment_status != 'unpaid'
  fullyPaid: boolean            // payment_status == 'paid'
  isLegallyActionable: boolean  // deposit received OR status >= paid

  // Stage 6–9 — Operational readiness
  guestCountStable: boolean     // status >= accepted (client agreed)
  eventConfirmed: boolean       // status >= confirmed

  // Timeline & Travel
  dateWithin7Days: boolean
  dateWithin3Days: boolean
  dateWithin24Hours: boolean
  dateIsToday: boolean
  dateInPast: boolean

  // Lifecycle terminals
  isCancelled: boolean
  isCompleted: boolean
  isTerminal: boolean           // cancelled OR completed
}

// ============================================
// WORK ITEMS
// ============================================

/**
 * The 17 operational stages from the Process Master Document.
 * Each maps to a slice of the chef's workflow around an event.
 */
export type WorkStage =
  | 'inquiry_intake'
  | 'qualification'
  | 'menu_development'
  | 'quote'
  | 'financial_commitment'
  | 'grocery_list'
  | 'prep_list'
  | 'equipment_planning'
  | 'packing'
  | 'timeline'
  | 'travel_arrival'
  | 'execution'
  | 'breakdown'
  | 'post_event_capture'
  | 'follow_up'
  | 'financial_closure'
  | 'inquiry_closure'

/**
 * Classification of a work item based on confirmed facts.
 */
export type WorkCategory =
  | 'blocked'           // Depends on unconfirmed facts
  | 'preparable'        // Can be safely done now
  | 'optional_early'    // Reduces future stress, not required yet

/**
 * Urgency level — drives dashboard ordering and visual treatment.
 */
export type WorkUrgency =
  | 'fragile'           // Will cause stacking if delayed
  | 'normal'            // Standard preparable work
  | 'low'               // Optional / nice to have now

/**
 * A single actionable work item surfaced by the engine.
 */
export interface WorkItem {
  id: string                    // Deterministic: `${eventId}:${stage}:${key}`
  eventId: string
  eventOccasion: string
  eventDate: string             // ISO 8601
  clientName: string

  stage: WorkStage
  stageNumber: number           // 1–17
  stageLabel: string            // Human-readable stage name

  category: WorkCategory
  urgency: WorkUrgency

  title: string                 // What needs to happen
  description: string           // Why it matters right now
  blockedBy?: string            // If blocked, what fact is missing
}

// ============================================
// ENGINE INPUT / OUTPUT
// ============================================

/**
 * Everything the engine needs to evaluate a single event.
 * Passed in — the engine does NOT fetch from the database.
 */
export interface EventContext {
  event: {
    id: string
    occasion: string | null
    event_date: string
    guest_count: number
    location_address: string | null
    special_requests: string | null
    quoted_price_cents: number | null
    deposit_amount_cents: number | null
    serve_time: string | null
    status: EventStatus
    client: {
      id: string
      full_name: string
      email: string
    } | null
  }
  menus: {
    id: string
    name: string
    status: string
    dishCount: number
  }[]
  financial: {
    totalPaidCents: number
    outstandingBalanceCents: number
    paymentStatus: PaymentStatus | null
  } | null
}

/**
 * Output of GET_PREPARABLE_ACTIONS for a single event.
 */
export interface EventWorkSurface {
  eventId: string
  eventOccasion: string
  eventDate: string
  clientName: string
  status: EventStatus
  facts: ConfirmedFacts
  items: WorkItem[]
}

/**
 * Dashboard-level aggregation across all active events.
 */
export interface DashboardWorkSurface {
  blocked: WorkItem[]
  preparable: WorkItem[]
  optionalEarly: WorkItem[]
  fragile: WorkItem[]           // Subset of preparable that is urgency=fragile
  byEvent: EventWorkSurface[]
  summary: {
    totalActiveEvents: number
    totalPreparableActions: number
    totalBlockedActions: number
    totalFragileActions: number
  }
}
