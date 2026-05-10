// Action Center - Unified Type System
// Pure types. No server directive. No side effects.

export type ActionSource = 'notification' | 'reminder' | 'task'

export type ActionPriority = 'urgent' | 'high' | 'medium' | 'low'

export type ActionStatus = 'pending' | 'active' | 'snoozed' | 'completed' | 'dismissed'

// Unified action item that wraps any of the three source types
export interface UnifiedActionItem {
  id: string
  source: ActionSource
  sourceId: string // Original ID in source table

  // Display
  title: string
  description: string | null
  priority: ActionPriority
  status: ActionStatus

  // Time
  createdAt: string
  dueAt: string | null // due_date+due_time for tasks/reminders, null for notifications
  snoozedUntil: string | null

  // Context links
  eventId: string | null
  clientId: string | null
  inquiryId: string | null
  actionUrl: string | null

  // Source-specific metadata
  metadata: Record<string, unknown>

  // Smart routing
  linkedTaskId: string | null // notification -> task
  linkedNotificationId: string | null // reminder escalation -> notification
}

// Config for which notification actions require follow-up tasks
export const ACTIONABLE_NOTIFICATIONS: Set<string> = new Set([
  'new_inquiry',
  'inquiry_reply',
  'follow_up_due',
  'quote_expiring',
  'payment_failed',
  'dispute_created',
  'review_submitted',
  'event_collaboration_invite',
  'dietary_menu_conflict',
  'guest_dietary_alert',
  'client_allergy_changed',
  'wix_submission',
])

// Maps notification actions to auto-generated task titles
export const AUTO_TASK_TITLES: Record<string, string> = {
  new_inquiry: 'Respond to new inquiry',
  inquiry_reply: 'Review inquiry reply',
  follow_up_due: 'Send follow-up',
  quote_expiring: 'Follow up on expiring quote',
  payment_failed: 'Resolve failed payment',
  dispute_created: 'Handle payment dispute',
  review_submitted: 'Read client review',
  event_collaboration_invite: 'Review collaboration invite',
  dietary_menu_conflict: 'Resolve dietary conflict',
  guest_dietary_alert: 'Review guest dietary needs',
  client_allergy_changed: 'Update allergy records',
  wix_submission: 'Review website submission',
}

// Digest grouping keys
export type DigestGroupKey =
  | 'inquiries_batch'
  | 'payments_batch'
  | 'reviews_batch'
  | 'events_batch'
  | 'system_batch'
