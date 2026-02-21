/**
 * Event FSM — Pure Logic Layer
 *
 * Contains ONLY the state machine rules and validation functions.
 * No 'use server', no Supabase calls, no side effects.
 * This module is safe to import in unit tests and client components.
 *
 * The authoritative enforcement is done by:
 *   1. This module (app layer — enforces permissions + rule set)
 *   2. DB trigger validate_event_state_transition() (DB layer — enforces rules)
 */

export type EventStatus =
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'paid'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export const ALL_EVENT_STATUSES: EventStatus[] = [
  'draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress', 'completed', 'cancelled',
]

export const TERMINAL_STATES: EventStatus[] = ['completed', 'cancelled']

/** Valid next states for each current state */
export const TRANSITION_RULES: Record<EventStatus, EventStatus[]> = {
  draft:       ['proposed', 'paid', 'cancelled'],
  proposed:    ['accepted', 'cancelled'],
  accepted:    ['paid', 'cancelled'],
  paid:        ['confirmed', 'cancelled'],
  confirmed:   ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed:   [], // Terminal state — no further transitions
  cancelled:   [], // Terminal state — no further transitions
}

export type TransitionActor = 'chef' | 'client' | 'system'

/** Who is allowed to trigger each transition */
export const TRANSITION_PERMISSIONS: Record<string, TransitionActor | TransitionActor[]> = {
  'draft->proposed':        'chef',
  'proposed->accepted':     'client',
  'proposed->cancelled':    ['chef', 'client'],
  'accepted->cancelled':    ['chef', 'client'],
  'accepted->paid':         'system',   // Stripe webhook only
  'draft->paid':            'system',   // Instant-book: Stripe webhook
  'paid->confirmed':        'chef',
  'confirmed->in_progress': 'chef',
  'in_progress->completed': 'chef',
  '*->cancelled':           'chef',     // Chef can cancel from any non-terminal state
}

/**
 * Returns true if a transition from `from` to `to` exists in TRANSITION_RULES.
 */
export function isValidTransition(from: EventStatus, to: EventStatus): boolean {
  return TRANSITION_RULES[from]?.includes(to) ?? false
}

/**
 * Returns the list of states reachable from the given status.
 */
export function getAllowedTransitions(from: EventStatus): EventStatus[] {
  return TRANSITION_RULES[from] ?? []
}

/**
 * Returns true if the given actor is permitted to trigger the transition.
 * Does NOT check ownership — that is enforced in the server action layer.
 */
export function isActorPermitted(
  from: EventStatus,
  to: EventStatus,
  actor: TransitionActor
): boolean {
  const key = `${from}->${to}`
  const permission =
    TRANSITION_PERMISSIONS[key] ?? TRANSITION_PERMISSIONS['*->cancelled']

  if (!permission) return false

  const allowed = Array.isArray(permission) ? permission : [permission]
  return allowed.includes(actor)
}

/**
 * Validates a proposed transition and returns a result object.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function validateTransition(
  from: EventStatus,
  to: EventStatus,
  actor: TransitionActor | 'system'
): { valid: true } | { valid: false; reason: string } {
  // 1. Check state machine rules
  if (!isValidTransition(from, to)) {
    const allowed = getAllowedTransitions(from)
    return {
      valid: false,
      reason: allowed.length === 0
        ? `Cannot transition from terminal state '${from}'`
        : `Invalid transition from '${from}' to '${to}'. Allowed: ${allowed.join(', ')}`,
    }
  }

  // 2. Check actor permissions
  if (!isActorPermitted(from, to, actor as TransitionActor)) {
    const key = `${from}->${to}`
    const permission =
      TRANSITION_PERMISSIONS[key] ?? TRANSITION_PERMISSIONS['*->cancelled']
    const allowed = Array.isArray(permission) ? permission : [permission]

    if (allowed.includes('system')) {
      return { valid: false, reason: 'This transition can only be triggered by the system (webhook)' }
    }

    return { valid: false, reason: `'${allowed.join(' or ')}' permission required for this transition` }
  }

  return { valid: true }
}

/**
 * Returns true if the status is a terminal state (completed or cancelled).
 */
export function isTerminalState(status: EventStatus): boolean {
  return TERMINAL_STATES.includes(status)
}
