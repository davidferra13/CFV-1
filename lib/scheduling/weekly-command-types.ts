// Weekly Command Center - Type Definitions
// Types for multi-event weekly planning: overview, conflicts, ingredient
// consolidation, daily load breakdown, and revenue projection.

// ── Time Slot ───────────────────────────────────────────────────────────────────

export type TimeSlot = 'morning' | 'afternoon' | 'evening'

// ── Event Summary ───────────────────────────────────────────────────────────────

/** Compact event record used throughout the command center. */
export type CommandEventSummary = {
  eventId: string
  eventDate: string
  serveTime: string | null
  arrivalTime: string | null
  guestCount: number
  occasion: string | null
  status: string
  serviceStyle: string
  locationAddress: string | null
  locationCity: string | null
  clientName: string | null
  menuId: string | null
  menuName: string | null
  quotedPriceCents: number | null
  paymentStatus: string
  timeSlot: TimeSlot
}

// ── Weekly Command View ─────────────────────────────────────────────────────────

export type WeeklyCommandView = {
  weekStart: string
  weekEnd: string
  generatedAt: string
  totalEvents: number
  totalGuests: number
  totalQuotedCents: number
  eventsByDay: Record<string, CommandEventSummary[]>
  busiestDay: { date: string; eventCount: number } | null
  statusBreakdown: Record<string, number>
}

// ── Conflict Detection ──────────────────────────────────────────────────────────

export type ConflictType = 'time_overlap' | 'same_day_overload' | 'back_to_back'

export type WeeklyConflict = {
  type: ConflictType
  date: string
  severity: 'warning' | 'critical'
  message: string
  eventIds: string[]
}

export type WeeklyConflictsResult = {
  weekStart: string
  weekEnd: string
  conflicts: WeeklyConflict[]
  totalConflicts: number
  hasCritical: boolean
}

// ── Ingredient Consolidation ────────────────────────────────────────────────────

export type ConsolidatedIngredient = {
  ingredientId: string
  ingredientName: string
  category: string | null
  totalQuantity: number
  unit: string | null
  eventCount: number
  /** Which events use this ingredient */
  usedInEventIds: string[]
  lastPriceCents: number | null
}

export type WeeklyIngredientConsolidation = {
  weekStart: string
  weekEnd: string
  ingredients: ConsolidatedIngredient[]
  /** Ingredients appearing in 2+ events (bulk purchase candidates) */
  sharedIngredients: ConsolidatedIngredient[]
  totalUniqueIngredients: number
  totalSharedIngredients: number
}

// ── Daily Load Breakdown ────────────────────────────────────────────────────────

export type SlotLoad = {
  slot: TimeSlot
  events: CommandEventSummary[]
  totalGuests: number
}

export type DailyLoadBreakdown = {
  date: string
  dayName: string
  totalEvents: number
  totalGuests: number
  slots: SlotLoad[]
  peakSlot: TimeSlot | null
}

// ── Weekly Revenue Projection ───────────────────────────────────────────────────

export type EventRevenueProjection = {
  eventId: string
  eventDate: string
  occasion: string | null
  clientName: string | null
  guestCount: number
  quotedPriceCents: number | null
  paymentStatus: string
  /** Confirmed revenue from ledger entries (cents) */
  confirmedRevenueCents: number
}

export type WeeklyRevenueProjection = {
  weekStart: string
  weekEnd: string
  events: EventRevenueProjection[]
  totalQuotedCents: number
  totalConfirmedCents: number
  unpaidCount: number
  paidCount: number
  partialCount: number
}
