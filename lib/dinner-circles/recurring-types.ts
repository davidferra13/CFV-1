// ---------------------------------------------------------------------------
// Circle Recurring Event Support: shared types
// ---------------------------------------------------------------------------

/** Supported recurrence frequencies */
export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom'

/** Day of week (0 = Sunday, 6 = Saturday) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Configuration for a circle's recurring schedule */
export type RecurrenceConfig = {
  circleId: string
  tenantId: string
  pattern: RecurrencePattern
  /** Preferred day of week (0=Sun..6=Sat); null = no preference */
  dayOfWeek: DayOfWeek | null
  /** Preferred time in HH:MM format (24h); null = no preference */
  preferredTime: string | null
  /** Auto-create the next event this many days ahead; 0 = manual only */
  autoCreateDaysAhead: number
  /** Custom interval in days (only used when pattern = 'custom') */
  customIntervalDays: number | null
  /** ISO timestamp of the most recent occurrence created */
  lastOccurrenceAt: string | null
  /** ISO timestamp of the next scheduled date (computed) */
  nextScheduledAt: string | null
  createdAt: string
  updatedAt: string
}

/** Input for setting or updating recurrence on a circle */
export type SetRecurrenceInput = {
  pattern: RecurrencePattern
  dayOfWeek?: DayOfWeek | null
  preferredTime?: string | null
  autoCreateDaysAhead?: number
  customIntervalDays?: number | null
}

/** A single event in a recurring series with attendance stats */
export type RecurringEventEntry = {
  eventId: string
  eventDate: string | null
  status: string
  guestCount: number
  /** Number of guests who RSVP'd yes */
  confirmedGuests: number
  /** Number of unique guests */
  uniqueGuests: number
  menuName: string | null
  createdAt: string
}

/** Full series view for a circle */
export type RecurringEventSeries = {
  circleId: string
  circleName: string
  config: RecurrenceConfig | null
  totalEvents: number
  events: RecurringEventEntry[]
}

/** Computed next occurrence info */
export type NextOccurrence = {
  circleId: string
  nextDate: string
  dayOfWeek: number
  daysUntil: number
  basedOnPattern: RecurrencePattern
}

/** Aggregate insights across a recurring series */
export type SeriesStats = {
  circleId: string
  totalEvents: number
  /** Average guest count across all events */
  averageGuestCount: number
  /** Percentage of repeat guests (appeared in 2+ events) */
  guestRetentionRate: number
  /** Total revenue across all events in cents */
  totalRevenueCents: number
  /** Average spend per event in cents */
  averageSpendPerEventCents: number
  /** Most frequently served dishes across all events */
  popularDishes: Array<{ name: string; count: number }>
  /** Attendance trend: array of { date, count } sorted chronologically */
  attendanceTrend: Array<{ date: string; count: number }>
}
