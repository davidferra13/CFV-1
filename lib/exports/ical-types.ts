// iCal Export Types
// Shared types for generating RFC 5545 compliant .ics calendar feeds.

/**
 * A single calendar event to be rendered into an iCal VEVENT.
 * Supports both all-day events (date-only) and timed events (datetime).
 */
export interface ICalEvent {
  /** Unique identifier for this event (must be globally unique per RFC 5545) */
  uid: string
  /** Event summary / title */
  summary: string
  /** Multi-line description (will be escaped for iCal) */
  description: string
  /** Start date or datetime. Date = all-day event, Date with time = timed event */
  dtStart: Date
  /** End date or datetime. For all-day events, this is the exclusive end date */
  dtEnd: Date
  /** Whether this is an all-day event (DATE vs DATETIME) */
  allDay: boolean
  /** Optional location string */
  location?: string
  /** Optional categories (e.g., "Prep", "Service", "Travel") */
  categories?: string[]
}

/**
 * A complete iCal feed containing one or more events.
 */
export interface ICalFeed {
  /** Product identifier for the PRODID field */
  prodId: string
  /** Calendar name (X-WR-CALNAME) */
  calendarName: string
  /** Events to include */
  events: ICalEvent[]
}

/**
 * Options for controlling iCal export behavior.
 */
export interface ExportOptions {
  /** Include completed/past prep tasks (default: true) */
  includeCompleted?: boolean
  /** Include untimed/unscheduled items as notes (default: false) */
  includeUntimed?: boolean
  /** Custom calendar name override */
  calendarName?: string
}
