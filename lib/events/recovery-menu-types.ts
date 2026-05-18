/**
 * Recovery Menu & Confirmation Pattern Types
 *
 * Types for lifecycle recovery menus (failed/cancelled state recovery)
 * and confirmation dialogs for destructive lifecycle transitions.
 */

import type { EventStatus } from './fsm'

// ── Recovery Options ──────────────────────────────────────────────────────

export type RecoveryOption = {
  id: string
  label: string
  description: string
  targetState: EventStatus
  requiresConfirmation: boolean
  /** Conditions that must be true for this option to be available */
  conditions: RecoveryCondition[]
}

export type RecoveryCondition = {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'exists' | 'not_exists'
  value?: string | number | boolean
}

export type RecoveryMenuResult = {
  eventId: string
  currentState: EventStatus
  options: RecoveryOption[]
  /** Milliseconds since the event entered its current state */
  timeInCurrentState: number | null
}

// ── Confirmation Patterns ─────────────────────────────────────────────────

export type ConfirmationSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ConfirmationPattern = {
  id: string
  transitionFrom: EventStatus
  transitionTo: EventStatus
  severity: ConfirmationSeverity
  message: string
  requiresReason: boolean
  cooldownMinutes: number
}

export type ConfirmationResult = {
  required: boolean
  pattern: ConfirmationPattern | null
  /** If within cooldown from a recent attempt */
  cooldownActive: boolean
  cooldownExpiresAt: string | null
}

// ── Recovery Attempts (audit trail) ───────────────────────────────────────

export type RecoveryOutcome = 'success' | 'failed' | 'cancelled'

export type RecoveryAttempt = {
  id: string
  eventId: string
  chefId: string
  optionId: string
  fromState: EventStatus
  toState: EventStatus
  reason: string | null
  outcome: RecoveryOutcome
  createdAt: string
}

// ── Action Results ────────────────────────────────────────────────────────

export type RecoveryActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}
