'use server'

// Re-export facade for backwards compatibility. Canonical path: lib/follow-up/

export type { FollowUpStep, FollowUpSequence } from '@/lib/follow-up/sequence-crud'

export {
  getSequences,
  getActiveSequencesForTrigger,
  createSequence,
  updateSequence,
  toggleSequence,
} from '@/lib/follow-up/sequence-crud'
