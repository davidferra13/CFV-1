// Weekly Retro - Type Definitions
// Types for weekly retrospective views: what happened, what worked,
// what to improve, trends over time.

// ============================================
// FLAG & SECTION ENUMS
// ============================================

/**
 * Sentiment flag for retro highlights and metrics.
 */
export type RetroFlag = 'positive' | 'neutral' | 'negative'

/**
 * Named sections of a weekly retro.
 */
export type RetroSection =
  | 'events_completed'
  | 'revenue_summary'
  | 'client_feedback'
  | 'menu_performance'
  | 'time_management'
  | 'lessons_learned'

// ============================================
// CORE TYPES
// ============================================

/**
 * A single measurable metric within a retro section.
 */
export type RetroMetric = {
  label: string
  value: number
  unit: string | null
  previousValue: number | null
  flag: RetroFlag
}

/**
 * A notable highlight or callout from the week.
 */
export type RetroHighlight = {
  section: RetroSection
  text: string
  flag: RetroFlag
  eventId: string | null
  clientName: string | null
}

/**
 * Events completed section data.
 */
export type RetroEventsCompleted = {
  total: number
  totalGuests: number
  cancelledCount: number
  changedCount: number
  avgGuestsPerEvent: number
  events: Array<{
    eventId: string
    occasion: string | null
    eventDate: string
    guestCount: number
    clientName: string | null
    status: string
  }>
}

/**
 * Revenue summary section data.
 */
export type RetroRevenueSummary = {
  totalRevenueCents: number
  eventRevenueCents: number
  paymentCount: number
  refundCount: number
  refundTotalCents: number
  avgRevenuePerEventCents: number
}

/**
 * Client feedback section data.
 */
export type RetroClientFeedback = {
  feedbackCount: number
  avgOverallRating: number | null
  avgFoodRating: number | null
  avgExperienceRating: number | null
  testimonialCount: number
  highlights: string[]
  suggestions: string[]
}

/**
 * Menu performance section data.
 */
export type RetroMenuPerformance = {
  menusUsed: number
  uniqueMenuNames: string[]
  reusedMenuCount: number
  totalDishes: number
}

/**
 * Time management section data.
 */
export type RetroTimeManagement = {
  totalPrepTasks: number
  completedPrepTasks: number
  totalEstimatedMinutes: number
  totalActualMinutes: number
  accuracyPercent: number | null
  overrunTasks: number
  underrunTasks: number
}

/**
 * Client acquisition breakdown for the week.
 */
export type RetroClientBreakdown = {
  totalClients: number
  newClients: number
  returningClients: number
  newClientNames: string[]
}

/**
 * A chef's personal note or reflection on a week.
 */
export type RetroNote = {
  id: string
  weekStart: string
  note: string
  createdAt: string
}

/**
 * The full weekly retrospective.
 */
export type WeeklyRetro = {
  weekStart: string
  weekEnd: string
  generatedAt: string
  eventsCompleted: RetroEventsCompleted
  revenueSummary: RetroRevenueSummary
  clientFeedback: RetroClientFeedback
  menuPerformance: RetroMenuPerformance
  timeManagement: RetroTimeManagement
  clientBreakdown: RetroClientBreakdown
  highlights: RetroHighlight[]
  metrics: RetroMetric[]
  notes: RetroNote[]
}

/**
 * Multi-week trend data point.
 */
export type RetroTrendPoint = {
  weekStart: string
  weekEnd: string
  eventCount: number
  totalRevenueCents: number
  avgRating: number | null
  totalGuests: number
  prepAccuracyPercent: number | null
  newClients: number
}

/**
 * Multi-week trend comparison result.
 */
export type RetroTrends = {
  weeks: number
  points: RetroTrendPoint[]
  revenueDirection: RetroFlag
  satisfactionDirection: RetroFlag
  efficiencyDirection: RetroFlag
}
