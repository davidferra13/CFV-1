// Notification Triage Types
// Types for inbox triage: bulk operations, snooze, filtering, priority sorting

import type { Notification, NotificationCategory } from './types'
import type { NotificationTier } from './tier-config'

/** Notification extended with triage metadata (snooze, priority) */
export type TriageNotification = Notification & {
  snoozed_until: string | null
  priority: NotificationTier
  source_label: string
}

/** Filter options for the triage inbox */
export type TriageFilter = {
  source?: NotificationCategory
  priority?: NotificationTier
  read?: boolean
  dateFrom?: string
  dateTo?: string
}

/** Snooze configuration for a single notification */
export type SnoozeConfig = {
  notificationId: string
  snoozeUntil: Date
}

/** Count of notifications per priority level */
export type PriorityBreakdown = {
  critical: number
  alert: number
  info: number
}

/** Standard result type for triage actions */
export type TriageActionResult = {
  success: boolean
  error?: string
  affected?: number
}
