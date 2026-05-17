// Event Closeout Types (unified)
// Merges manual checklist types (events) and data-driven completeness types (lifecycle).

// ── Known Checklist Keys (manual checklist) ────────────────────────────────

export const CLOSEOUT_ITEM_KEYS = [
  'final_guest_count',
  'tip_logged',
  'expenses_logged',
  'photos_uploaded',
  'feedback_request_sent',
  'notes_captured',
  'payment_confirmed',
] as const

export type CloseoutItemKey = (typeof CLOSEOUT_ITEM_KEYS)[number]

export const CLOSEOUT_ITEM_LABELS: Record<CloseoutItemKey, string> = {
  final_guest_count: 'Final guest count confirmed',
  tip_logged: 'Tip logged',
  expenses_logged: 'Expenses logged',
  photos_uploaded: 'Photos uploaded',
  feedback_request_sent: 'Feedback request sent',
  notes_captured: 'Post-service notes captured',
  payment_confirmed: 'Payment confirmed',
}

// ── Shared Statuses ────────────────────────────────────────────────────────

export type CloseoutItemStatus = 'pending' | 'completed' | 'skipped' | 'blocked'

export type CloseoutStatus = 'in_progress' | 'complete'

// ── Closeout Item ──────────────────────────────────────────────────────────

export type CloseoutItem = {
  key: CloseoutItemKey | string
  label: string
  description?: string
  status: CloseoutItemStatus
  required?: boolean
  completedAt: string | null
  category?: 'financial' | 'communication' | 'documentation' | 'followup'
}

// ── Closeout Checklist ─────────────────────────────────────────────────────

export type CloseoutChecklist = {
  id?: string
  eventId: string
  tenantId?: string
  status?: CloseoutStatus
  items: CloseoutItem[]
  overallPercent?: number
  canFinalize?: boolean
  blockers?: string[]
  initiatedAt?: string
  finalizedAt?: string | null
}

// ── Closeout Reminder ──────────────────────────────────────────────────────

export interface CloseoutReminder {
  id: string
  tenantId: string
  eventId: string
  itemKey: string
  reminderAt: string
  sent: boolean
}
