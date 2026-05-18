// Remy Draft Boundary Types
// Enforces the principle: Remy suggests, chef decides.
// No lifecycle transitions execute without chef approval unless explicitly whitelisted.

import type { EventStatus } from '@/lib/events/fsm'

export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface DraftedTransition {
  id: string
  eventId: string
  chefId: string
  fromState: EventStatus
  toState: EventStatus
  reason: string
  remyConfidence: number // 0-1
  evidence: string[]
  draftStatus: DraftStatus
  createdAt: string
  expiresAt: string
  reviewedAt: string | null
  reviewedBy: string | null
}

export interface DraftApprovalRequest {
  draftId: string
  approverAction: 'approve' | 'reject'
  reason?: string
}

export interface DraftBoundaryConfig {
  chefId: string
  /** Transition-level overrides. Key format: "fromState->toState" */
  overrides: DraftBoundaryOverride[]
}

export interface DraftBoundaryOverride {
  transitionFrom: EventStatus
  transitionTo: EventStatus
  requiresApproval: boolean
}

export interface DraftBoundaryResult {
  success: boolean
  error?: string
  draft?: DraftedTransition
  drafts?: DraftedTransition[]
  config?: DraftBoundaryConfig
}
