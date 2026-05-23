// Event Stop/Resume Trail Types
// Captures pause/resume history for events so chefs can cleanly
// stop planning, come back later, and see what changed while paused.

import type { EventStatus } from './fsm'

/**
 * Snapshot of event state at the moment planning was paused.
 * Used to show the chef what changed between pause and resume.
 */
export type EventStateSnapshot = {
  status: EventStatus
  assigned_staff_ids: string[]
  menu_id: string | null
  guest_count: number
  notes: string | null
  occasion: string | null
  event_date: string | null
  quoted_price_cents: number | null
}

/**
 * A single pause/resume trail entry.
 * resumed_at is null while the event is still paused.
 */
export type PauseTrail = {
  id: string
  event_id: string
  tenant_id: string
  paused_by: string
  paused_at: string
  resumed_at: string | null
  reason: string | null
  state_snapshot: EventStateSnapshot
}

/**
 * Result from resuming: shows what changed while the event was paused.
 */
export type ResumeDiff = {
  field: string
  before: unknown
  after: unknown
}

export type ResumeResult = {
  trail: PauseTrail
  changes: ResumeDiff[]
}
