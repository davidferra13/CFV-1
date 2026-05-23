// Unified Follow-Up Facade
// Single import surface for all follow-up systems.
//
// The follow-up domain has four complementary engines:
// 1. Sequence CRUD: chef-configurable follow-up sequences (lib/communication/follow-up-actions.ts)
// 2. Sequence Engine: scheduling, processing, sending follow-up emails (lib/follow-up/)
// 3. Post-Event Checklist: guided post-event follow-up steps (lib/events/follow-up-actions.ts)
// 4. Stale Inquiry Detection: finds inquiries needing nudges (lib/inquiries/follow-up-actions.ts)
// 5. AI Draft Generation: contextual follow-up drafts (lib/ai/followup-draft.ts)
//
// This facade re-exports everything so consumers use one import path.

// Sequence definitions (CRUD for follow_up_sequences table)
export type { FollowUpStep as SequenceStep, FollowUpSequence } from './follow-up-actions'

export {
  getSequences,
  getActiveSequencesForTrigger,
  createSequence,
  updateSequence,
  toggleSequence,
} from './follow-up-actions'

// Sequence execution engine (scheduling, processing follow_up_sends)
export {
  schedulePostEventFollowUp,
  cancelFollowUpSends,
  getNextPendingSends,
  processPendingSend,
} from '@/lib/follow-up/sequence-engine'

// Post-event follow-up state and checklist
export type {
  FollowUpStep as EventFollowUpStep,
  FollowUpState as EventFollowUpState,
} from '@/lib/events/follow-up-actions'

export {
  getEventFollowUpState,
  markThankYouSentFromFollowUp,
  sendSurveyFromFollowUp,
  markReviewRequestedFromFollowUp,
} from '@/lib/events/follow-up-actions'

// Post-event follow-up server actions (send management)
export {
  getEventFollowUpSends,
  cancelEventFollowUp,
  triggerFollowUpForEvent,
  getFollowUpStats,
} from '@/lib/follow-up/follow-up-actions'

// Stale inquiry detection
export type { PendingFollowUp } from '@/lib/inquiries/follow-up-actions'

export { getStaleInquiries, getPendingFollowUpCount } from '@/lib/inquiries/follow-up-actions'

// AI draft generation (canonical path, not the duplicate)
export { generateFollowUpDraft } from '@/lib/ai/followup-draft'

// Follow-up delivery (inquiry follow-up emails to chef)
export {
  sendFollowUpDueEmailDelivery,
  redeliverFollowUpDueEmail,
} from '@/lib/inquiries/follow-up-delivery'
