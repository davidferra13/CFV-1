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
 * Every field is boolean. The engine never guesses.
 */
export interface ConfirmedFacts {
  // Stage 1 - Inquiry Intake
  hasClient: boolean
  hasOccasion: boolean
  hasDate: boolean
  hasLocation: boolean
  hasGuestCount: boolean

  // Stage 2 - Qualification
  hasServeTimeWindow: boolean
  hasMenuDirection: boolean

  // Stage 3 - Menu Development
  hasMenuAttached: boolean
  hasMenuWithDishes: boolean
  menuGravityStable: boolean

  // Stage 4 - Quote
  hasPricing: boolean
  hasDepositDefined: boolean

  // Stage 5 - Financial Commitment
  depositReceived: boolean
  fullyPaid: boolean
  isLegallyActionable: boolean

  // Stage 6-12 - Operational readiness
  guestCountStable: boolean
  eventConfirmed: boolean
  groceryListReady: boolean
  prepListReady: boolean
  equipmentListReady: boolean
  packingListReady: boolean
  timelineReady: boolean
  executionSheetReady: boolean
  nonNegotiablesChecked: boolean
  shoppingComplete: boolean
  prepComplete: boolean
  carPacked: boolean
  hasActiveShoppingList: boolean
  packingProgressStarted: boolean
  hasTravelRoute: boolean

  // Timeline and travel windows
  dateWithin7Days: boolean
  dateWithin3Days: boolean
  dateWithin24Hours: boolean
  dateIsToday: boolean
  dateInPast: boolean

  // Lifecycle terminals
  isCancelled: boolean
  isCompleted: boolean
  isTerminal: boolean
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
export type WorkCategory = 'blocked' | 'preparable' | 'optional_early'

/**
 * Urgency level. Drives dashboard ordering and visual treatment.
 */
export type WorkUrgency = 'fragile' | 'normal' | 'low'

/**
 * A single actionable work item surfaced by the engine.
 */
export interface WorkItem {
  id: string
  eventId: string
  eventOccasion: string
  eventDate: string
  clientName: string
  actionUrl: string
  actionLabel: string
  stage: WorkStage
  stageNumber: number
  stageLabel: string
  category: WorkCategory
  urgency: WorkUrgency
  title: string
  description: string
  blockedBy?: string
}

// ============================================
// ENGINE INPUT / OUTPUT
// ============================================

/**
 * Everything the engine needs to evaluate a single event.
 * Passed in. The engine does not fetch from the database.
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
  ops: {
    groceryListReady: boolean
    prepListReady: boolean
    equipmentListReady: boolean
    packingListReady: boolean
    timelineReady: boolean
    executionSheetReady: boolean
    nonNegotiablesChecked: boolean
    shoppingCompletedAt: string | null
    prepCompletedAt: string | null
    carPacked: boolean
    carPackedAt: string | null
  }
  menus: {
    id: string
    name: string
    status: string
    dishCount: number
  }[]
  shopping: {
    activeListId: string | null
    hasActiveList: boolean
    completedListCount: number
    lastCompletedAt: string | null
  }
  packing: {
    confirmedItemCount: number
  }
  travel: {
    hasServiceTravelRoute: boolean
  }
  financial: {
    totalPaidCents: number
    outstandingBalanceCents: number
    paymentStatus: PaymentStatus | null
  } | null
}

/**
 * Output of getPreparableActions for a single event.
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
  fragile: WorkItem[]
  byEvent: EventWorkSurface[]
  summary: {
    totalActiveEvents: number
    totalPreparableActions: number
    totalBlockedActions: number
    totalFragileActions: number
  }
}
