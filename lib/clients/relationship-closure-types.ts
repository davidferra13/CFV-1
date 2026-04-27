/**
 * Client Relationship Closure: shared types for the closure policy system.
 * Pure types only, no runtime dependencies.
 */

export type ClosureMode = 'transitioning' | 'closed' | 'do_not_book' | 'legal_hold'

export type ClosureReasonCategory =
  | 'moving_away'
  | 'chef_capacity'
  | 'client_requested'
  | 'relationship_soured'
  | 'payment_risk'
  | 'safety_risk'
  | 'legal_dispute'
  | 'other'

export type ActiveEventPolicy =
  | 'continue_active_events'
  | 'cancel_active_events'
  | 'review_each_event'

export interface ClientRelationshipClosure {
  id: string
  tenant_id: string
  client_id: string
  closure_mode: ClosureMode
  reason_category: ClosureReasonCategory
  internal_notes: string | null
  client_message: string | null
  block_new_events: boolean
  block_public_booking: boolean
  block_automated_outreach: boolean
  revoke_portal_access: boolean
  allow_active_event_messages_until: string | null
  active_event_policy: ActiveEventPolicy
  created_by: string
  created_at: string
  reopened_by: string | null
  reopened_at: string | null
  reopen_reason: string | null
  metadata: Record<string, unknown>
}

/** Human-readable labels for UI display */
export const CLOSURE_MODE_LABELS: Record<ClosureMode, string> = {
  transitioning: 'Transitioning',
  closed: 'Closed',
  do_not_book: 'Do Not Book',
  legal_hold: 'Legal Hold',
}

export const CLOSURE_REASON_LABELS: Record<ClosureReasonCategory, string> = {
  moving_away: 'Client moving away',
  chef_capacity: 'Chef at capacity',
  client_requested: 'Client requested',
  relationship_soured: 'Relationship soured',
  payment_risk: 'Payment risk',
  safety_risk: 'Safety risk',
  legal_dispute: 'Legal dispute',
  other: 'Other',
}
