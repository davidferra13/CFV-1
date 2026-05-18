// Remy Routines - Safety boundaries
// Routines cannot perform irreversible actions without chef approval.
// Integrates with the existing Remy safety triage system.

import type { RoutineActionDef, RoutineActionKind, RemyRoutine } from './types'

// ---- Blocked Action Kinds ----
// These action kinds are NEVER allowed without approval_required = true.

const ALWAYS_REQUIRES_APPROVAL: RoutineActionKind[] = []

// Action kinds that are inherently safe (informational, draft-only).
const SAFE_ACTION_KINDS: RoutineActionKind[] = [
  'record_routine_event',
  'queue_review',
  'create_notification_draft',
  'create_task_draft',
]

// ---- Forbidden Payload Patterns ----
// Routines must never include payloads that reference money movement,
// data deletion, or irreversible status changes.

const FORBIDDEN_PAYLOAD_KEYWORDS = [
  'delete',
  'destroy',
  'drop',
  'truncate',
  'send_payment',
  'transfer_funds',
  'charge',
  'refund',
  'cancel_event',
  'archive_client',
  'remove_client',
  'send_email',
  'send_sms',
] as const

export type RoutineSafetyVerdict = {
  safe: boolean
  requires_approval: boolean
  violations: string[]
  warnings: string[]
}

/**
 * Evaluate whether a routine definition passes safety checks.
 * Called before saving and before executing.
 */
export function evaluateRoutineSafety(routine: {
  actions: RoutineActionDef[]
  approval_required: boolean
}): RoutineSafetyVerdict {
  const violations: string[] = []
  const warnings: string[] = []
  let requiresApproval = routine.approval_required

  for (const action of routine.actions) {
    // Check if action kind always requires approval
    if (ALWAYS_REQUIRES_APPROVAL.includes(action.kind)) {
      requiresApproval = true
      warnings.push(`Action "${action.label}" (${action.kind}) always requires chef approval.`)
    }

    // Validate action kind is in the allowed set
    if (!SAFE_ACTION_KINDS.includes(action.kind)) {
      violations.push(`Action kind "${action.kind}" is not in the allowed set for routines.`)
    }

    // Scan payload for forbidden keywords
    const payloadStr = JSON.stringify(action.payload).toLowerCase()
    for (const keyword of FORBIDDEN_PAYLOAD_KEYWORDS) {
      if (payloadStr.includes(keyword)) {
        violations.push(
          `Action "${action.label}" payload contains forbidden keyword "${keyword}". ` +
            'Routines cannot perform irreversible actions.'
        )
      }
    }
  }

  // Empty actions list is suspicious
  if (routine.actions.length === 0) {
    warnings.push('Routine has no actions defined. It will match but do nothing.')
  }

  return {
    safe: violations.length === 0,
    requires_approval: requiresApproval,
    violations,
    warnings,
  }
}

/**
 * Gate check before routine execution.
 * Returns true if the routine is safe to execute without further approval.
 * Returns false if the routine needs chef sign-off first.
 */
export function canExecuteWithoutApproval(routine: RemyRoutine): boolean {
  if (routine.approval_required) return false

  const verdict = evaluateRoutineSafety({
    actions: routine.actions,
    approval_required: routine.approval_required,
  })

  return verdict.safe && !verdict.requires_approval
}

/**
 * Validate a single action definition before it is added to a routine.
 */
export function validateActionDef(action: RoutineActionDef): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!action.id || action.id.trim().length === 0) {
    errors.push('Action id is required.')
  }
  if (!action.kind) {
    errors.push('Action kind is required.')
  } else if (!SAFE_ACTION_KINDS.includes(action.kind)) {
    errors.push(`Action kind "${action.kind}" is not allowed.`)
  }
  if (!action.label || action.label.trim().length === 0) {
    errors.push('Action label is required.')
  }

  const payloadStr = JSON.stringify(action.payload).toLowerCase()
  for (const keyword of FORBIDDEN_PAYLOAD_KEYWORDS) {
    if (payloadStr.includes(keyword)) {
      errors.push(`Payload contains forbidden keyword "${keyword}".`)
    }
  }

  return { valid: errors.length === 0, errors }
}
