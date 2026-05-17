// Batch View - Type Definitions
// Types for weekly batch overview: events grouped by day with prep/service windows,
// shared ingredients, day load forecasting, and unified timelines.

// ============================================
// CORE TYPES
// ============================================

/**
 * A single event's summary within a batch day.
 */
export type BatchEventSummary = {
  eventId: string
  occasion: string | null
  eventDate: string
  serveTime: string | null
  arrivalTime: string | null
  travelTimeMinutes: number | null
  guestCount: number | null
  status: string | null
  clientName: string | null
  locationCity: string | null
  menuCount: number
  componentCount: number
  prepCompleted: boolean
  shoppingCompleted: boolean
}

/**
 * A single day in the batch view with all its events.
 */
export type BatchDay = {
  date: string
  dayLabel: string
  dayOfWeek: number
  events: BatchEventSummary[]
  totalGuests: number
  prepBlocks: BatchPrepItem[]
}

/**
 * A prep block tied to a specific event on a specific day.
 */
export type BatchPrepItem = {
  blockId: string
  eventId: string | null
  eventOccasion: string | null
  title: string
  blockDate: string
  startTime: string | null
  endTime: string | null
}

/**
 * An ingredient shared across multiple events, for bulk purchasing.
 */
export type SharedIngredient = {
  ingredientName: string
  totalQuantity: number
  unit: string | null
  events: Array<{
    eventId: string
    eventOccasion: string | null
    quantity: number
  }>
  /** Number of events using this ingredient */
  sharedCount: number
}

/**
 * Day load forecast: how heavy a given day is across events, prep, and travel.
 */
export type DayLoad = {
  date: string
  dayLabel: string
  eventCount: number
  totalGuests: number
  prepBlockCount: number
  estimatedPrepMinutes: number
  estimatedTravelMinutes: number
  /** 0-100 load score */
  loadScore: number
  status: 'light' | 'moderate' | 'heavy' | 'overloaded'
}

/**
 * A timeline entry spanning all events in a date range.
 */
export type BatchTimelineEntry = {
  time: string
  type: 'prep' | 'travel' | 'arrival' | 'service' | 'event'
  label: string
  eventId: string | null
  eventOccasion: string | null
  date: string
}

/**
 * Weekly batch overview result.
 */
export type WeeklyBatchView = {
  weekStart: string
  weekEnd: string
  days: BatchDay[]
  totalEvents: number
  totalGuests: number
}

/**
 * Batch prep consolidation result: overlapping events and shared ingredient opportunities.
 */
export type BatchPrepConsolidation = {
  dateRange: { start: string; end: string }
  overlappingDays: Array<{
    date: string
    events: BatchEventSummary[]
  }>
  sharedIngredients: SharedIngredient[]
  totalEvents: number
}

/**
 * Batch timeline result across a date range.
 */
export type BatchTimeline = {
  dateRange: { start: string; end: string }
  entries: BatchTimelineEntry[]
  totalEvents: number
}
