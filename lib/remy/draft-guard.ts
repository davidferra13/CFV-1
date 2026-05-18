// Remy Draft Guard
// Single entry point for Remy's action pipeline before executing any lifecycle transition.
// Core principle: Remy suggests, chef decides.

import { isDraftRequired, createDraftTransition } from './draft-boundary-actions'

export interface DraftGuardResult {
  allowed: boolean
  draftId?: string
  message: string
}

/**
 * Call this before Remy executes any lifecycle transition.
 *
 * If the transition requires chef approval (default for all transitions),
 * a draft is created and the caller gets { allowed: false, draftId, message }.
 *
 * If the chef has whitelisted this transition, the caller gets { allowed: true }
 * and can proceed with execution.
 */
export async function guardRemyTransition(
  eventId: string,
  fromState: string,
  toState: string,
  reason: string,
  confidence: number,
  evidence: string[]
): Promise<DraftGuardResult> {
  try {
    const required = await isDraftRequired(fromState, toState)

    if (!required) {
      return {
        allowed: true,
        message: 'Auto-approved by boundary config',
      }
    }

    // Draft required: create it and block execution
    const result = await createDraftTransition(eventId, toState, reason, confidence, evidence)

    if (!result.success) {
      return {
        allowed: false,
        message: `Draft creation failed: ${result.error || 'unknown error'}`,
      }
    }

    return {
      allowed: false,
      draftId: result.draft?.id,
      message: 'Draft created for chef review',
    }
  } catch (err) {
    // On any error, block the transition (fail-safe)
    return {
      allowed: false,
      message: `Guard check failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
