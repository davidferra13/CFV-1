'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { log } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { transitionEvent } from './transitions'
import { TRANSITION_RULES, TERMINAL_STATES } from './fsm'
import type { EventStatus } from './fsm'
import type {
  RecoveryOption,
  RecoveryMenuResult,
  ConfirmationPattern,
  ConfirmationResult,
  RecoveryAttempt,
  RecoveryActionResult,
  ConfirmationSeverity,
} from './recovery-menu-types'

// ── Recovery Option Definitions ───────────────────────────────────────────

/**
 * Static registry of recovery paths from terminal/stuck states.
 * Cancelled events can be revived to draft or re-proposed.
 * Each option maps a current state to a target state with conditions.
 */
const RECOVERY_REGISTRY: Record<string, RecoveryOption[]> = {
  cancelled: [
    {
      id: 'revive-to-draft',
      label: 'Revive as Draft',
      description: 'Reopen this event as a new draft for editing',
      targetState: 'draft',
      requiresConfirmation: true,
      conditions: [],
    },
    {
      id: 'revive-to-proposed',
      label: 'Revive and Re-propose',
      description: 'Reopen and send a new proposal to the client',
      targetState: 'proposed',
      requiresConfirmation: true,
      conditions: [{ field: 'client_id', operator: 'exists' }],
    },
  ],
}

// ── Default Confirmation Patterns ─────────────────────────────────────────

const DEFAULT_CONFIRMATIONS: Array<{
  transitionFrom: EventStatus
  transitionTo: EventStatus
  severity: ConfirmationSeverity
  message: string
  requiresReason: boolean
  cooldownMinutes: number
}> = [
  {
    transitionFrom: 'confirmed',
    transitionTo: 'cancelled',
    severity: 'critical',
    message: 'This event is confirmed. Cancelling may incur fees and will notify the client.',
    requiresReason: true,
    cooldownMinutes: 5,
  },
  {
    transitionFrom: 'in_progress',
    transitionTo: 'cancelled',
    severity: 'critical',
    message: 'This event is in progress. Cancelling a live event is irreversible.',
    requiresReason: true,
    cooldownMinutes: 10,
  },
  {
    transitionFrom: 'paid',
    transitionTo: 'cancelled',
    severity: 'high',
    message: 'This event has been paid. Cancelling will require handling the refund.',
    requiresReason: true,
    cooldownMinutes: 5,
  },
  {
    transitionFrom: 'accepted',
    transitionTo: 'cancelled',
    severity: 'medium',
    message: 'The client accepted this event. Are you sure you want to cancel?',
    requiresReason: false,
    cooldownMinutes: 0,
  },
  {
    transitionFrom: 'proposed',
    transitionTo: 'cancelled',
    severity: 'low',
    message: 'Cancel this proposed event?',
    requiresReason: false,
    cooldownMinutes: 0,
  },
  {
    transitionFrom: 'draft',
    transitionTo: 'cancelled',
    severity: 'low',
    message: 'Discard this draft event?',
    requiresReason: false,
    cooldownMinutes: 0,
  },
]

// ── Actions ───────────────────────────────────────────────────────────────

/**
 * Get available recovery paths for an event's current state.
 * Only terminal/stuck states have recovery options.
 */
export async function getRecoveryOptions(
  eventId: string
): Promise<RecoveryActionResult<RecoveryMenuResult>> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: event, error: fetchError } = await db
    .from('events')
    .select('id, status, tenant_id, client_id, updated_at')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.tenant_id !== tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  const currentState = event.status as EventStatus
  const registryOptions = RECOVERY_REGISTRY[currentState] ?? []

  // Filter options by conditions
  const availableOptions = registryOptions.filter((opt) => {
    return opt.conditions.every((cond) => {
      const fieldVal = event[cond.field]
      switch (cond.operator) {
        case 'exists':
          return fieldVal != null && fieldVal !== ''
        case 'not_exists':
          return fieldVal == null || fieldVal === ''
        case 'eq':
          return fieldVal === cond.value
        case 'neq':
          return fieldVal !== cond.value
        case 'gt':
          return typeof fieldVal === 'number' && fieldVal > (cond.value as number)
        case 'lt':
          return typeof fieldVal === 'number' && fieldVal < (cond.value as number)
        default:
          return false
      }
    })
  })

  const timeInCurrentState = event.updated_at
    ? Date.now() - new Date(event.updated_at).getTime()
    : null

  return {
    success: true,
    data: {
      eventId,
      currentState,
      options: availableOptions,
      timeInCurrentState,
    },
  }
}

/**
 * Execute a recovery transition on a terminal/stuck event.
 * Bypasses normal FSM rules since recovery is a special path.
 */
export async function executeRecovery(
  eventId: string,
  optionId: string,
  reason?: string
): Promise<RecoveryActionResult<{ newState: EventStatus }>> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Fetch event
  const { data: event, error: fetchError } = await db
    .from('events')
    .select('id, status, tenant_id, client_id')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.tenant_id !== tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  const currentState = event.status as EventStatus

  // 2. Validate option exists for this state
  const registryOptions = RECOVERY_REGISTRY[currentState] ?? []
  const selectedOption = registryOptions.find((o) => o.id === optionId)

  if (!selectedOption) {
    return {
      success: false,
      error: `Recovery option "${optionId}" not available for ${currentState} events`,
    }
  }

  // 3. Direct status update (recovery bypasses FSM since terminal states have no transitions)
  try {
    const { error: updateError } = await db
      .from('events')
      .update({
        status: selectedOption.targetState,
        updated_at: new Date().toISOString(),
        cancelled_at: null,
        cancellation_reason: null,
      })
      .eq('id', eventId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      throw updateError
    }
  } catch (err: any) {
    log.events.error('Recovery transition failed', { context: { eventId, optionId }, error: err })

    // Log failed attempt
    await logRecoveryAttemptInternal(db, {
      eventId,
      chefId: tenantId,
      optionId,
      fromState: currentState,
      toState: selectedOption.targetState,
      reason: reason ?? null,
      outcome: 'failed',
    })

    return { success: false, error: err.message ?? 'Recovery transition failed' }
  }

  // 4. Log successful attempt
  await logRecoveryAttemptInternal(db, {
    eventId,
    chefId: tenantId,
    optionId,
    fromState: currentState,
    toState: selectedOption.targetState,
    reason: reason ?? null,
    outcome: 'success',
  })

  // 5. Record state transition in event_transitions for audit trail
  try {
    await db.from('event_transitions').insert({
      event_id: eventId,
      tenant_id: tenantId,
      from_status: currentState,
      to_status: selectedOption.targetState,
      triggered_by: 'chef',
      metadata: JSON.stringify({
        source: 'recovery-menu',
        recovery_option: optionId,
        reason: reason ?? null,
      }),
    })
  } catch (err) {
    log.events.warn('Failed to record recovery transition in audit log (non-blocking)', {
      error: err,
    })
  }

  revalidatePath(`/events/${eventId}`)

  return {
    success: true,
    data: { newState: selectedOption.targetState },
  }
}

/**
 * Check what confirmation is required before a given transition.
 * Returns chef-customized pattern if one exists, otherwise falls back to defaults.
 */
export async function getConfirmationRequirement(
  eventId: string,
  transitionTo: string
): Promise<RecoveryActionResult<ConfirmationResult>> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Fetch event
  const { data: event, error: fetchError } = await db
    .from('events')
    .select('id, status, tenant_id')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.tenant_id !== tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  const fromState = event.status as EventStatus
  const toState = transitionTo as EventStatus

  // 2. Check for chef-customized confirmation pattern
  const { data: customPattern } = await db
    .from('confirmation_patterns')
    .select('*')
    .eq('chef_id', tenantId)
    .eq('transition_from', fromState)
    .eq('transition_to', toState)
    .maybeSingle()

  let pattern: ConfirmationPattern | null = null

  if (customPattern) {
    pattern = {
      id: customPattern.id,
      transitionFrom: customPattern.transition_from,
      transitionTo: customPattern.transition_to,
      severity: customPattern.severity,
      message: customPattern.message,
      requiresReason: customPattern.requires_reason,
      cooldownMinutes: customPattern.cooldown_minutes,
    }
  } else {
    // Fall back to defaults
    const defaultMatch = DEFAULT_CONFIRMATIONS.find(
      (d) => d.transitionFrom === fromState && d.transitionTo === toState
    )
    if (defaultMatch) {
      pattern = {
        id: `default-${fromState}-${toState}`,
        ...defaultMatch,
      }
    }
  }

  if (!pattern) {
    return {
      success: true,
      data: { required: false, pattern: null, cooldownActive: false, cooldownExpiresAt: null },
    }
  }

  // 3. Check cooldown
  let cooldownActive = false
  let cooldownExpiresAt: string | null = null

  if (pattern.cooldownMinutes > 0) {
    const cutoff = new Date(Date.now() - pattern.cooldownMinutes * 60 * 1000).toISOString()

    const { data: recentAttempts } = await db
      .from('recovery_attempts')
      .select('created_at')
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)

    if (recentAttempts && recentAttempts.length > 0) {
      cooldownActive = true
      const attemptTime = new Date(recentAttempts[0].created_at).getTime()
      cooldownExpiresAt = new Date(attemptTime + pattern.cooldownMinutes * 60 * 1000).toISOString()
    }
  }

  return {
    success: true,
    data: {
      required: true,
      pattern,
      cooldownActive,
      cooldownExpiresAt,
    },
  }
}

/**
 * Log a recovery attempt for audit trail.
 */
export async function logRecoveryAttempt(
  eventId: string,
  optionId: string,
  outcome: 'success' | 'failed' | 'cancelled'
): Promise<RecoveryActionResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch event for state info
  const { data: event, error: fetchError } = await db
    .from('events')
    .select('id, status, tenant_id')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.tenant_id !== tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  const currentState = event.status as EventStatus
  const registryOptions = RECOVERY_REGISTRY[currentState] ?? []
  const selectedOption = registryOptions.find((o) => o.id === optionId)

  const toState = selectedOption?.targetState ?? currentState

  await logRecoveryAttemptInternal(db, {
    eventId,
    chefId: tenantId,
    optionId,
    fromState: currentState,
    toState,
    reason: null,
    outcome,
  })

  return { success: true }
}

/**
 * Get recovery attempt history for an event.
 */
export async function getRecoveryHistory(
  eventId: string
): Promise<RecoveryActionResult<RecoveryAttempt[]>> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify event ownership
  const { data: event, error: fetchError } = await db
    .from('events')
    .select('id, tenant_id')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.tenant_id !== tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: attempts, error: queryError } = await db
    .from('recovery_attempts')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', tenantId)
    .order('created_at', { ascending: false })

  if (queryError) {
    log.events.error('Failed to fetch recovery history', {
      context: { eventId },
      error: queryError,
    })
    return { success: false, error: 'Failed to fetch recovery history' }
  }

  const mapped: RecoveryAttempt[] = (attempts ?? []).map((a: any) => ({
    id: a.id,
    eventId: a.event_id,
    chefId: a.chef_id,
    optionId: a.option_id,
    fromState: a.from_state,
    toState: a.to_state,
    reason: a.reason,
    outcome: a.outcome,
    createdAt: a.created_at,
  }))

  return { success: true, data: mapped }
}

/**
 * Configure a custom confirmation pattern for a transition.
 * Allows chefs to customize confirmation severity, messages, and cooldowns.
 */
export async function configureConfirmationPattern(
  pattern: Omit<ConfirmationPattern, 'id'>
): Promise<RecoveryActionResult<{ id: string }>> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Validate severity
  const validSeverities: ConfirmationSeverity[] = ['low', 'medium', 'high', 'critical']
  if (!validSeverities.includes(pattern.severity)) {
    return { success: false, error: `Invalid severity: ${pattern.severity}` }
  }

  // Validate the transition states are real EventStatus values
  const validStatuses: EventStatus[] = [
    'draft',
    'proposed',
    'accepted',
    'paid',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
  ]
  if (!validStatuses.includes(pattern.transitionFrom)) {
    return { success: false, error: `Invalid from state: ${pattern.transitionFrom}` }
  }
  if (!validStatuses.includes(pattern.transitionTo)) {
    return { success: false, error: `Invalid to state: ${pattern.transitionTo}` }
  }

  // Validate cooldown is non-negative
  if (pattern.cooldownMinutes < 0) {
    return { success: false, error: 'Cooldown minutes cannot be negative' }
  }

  // Upsert: replace existing pattern for this chef + transition pair
  const { data: existing } = await db
    .from('confirmation_patterns')
    .select('id')
    .eq('chef_id', tenantId)
    .eq('transition_from', pattern.transitionFrom)
    .eq('transition_to', pattern.transitionTo)
    .maybeSingle()

  if (existing) {
    const { error: updateError } = await db
      .from('confirmation_patterns')
      .update({
        severity: pattern.severity,
        message: pattern.message,
        requires_reason: pattern.requiresReason,
        cooldown_minutes: pattern.cooldownMinutes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateError) {
      log.events.error('Failed to update confirmation pattern', {
        error: updateError,
        context: { tenantId },
      })
      return { success: false, error: 'Failed to update confirmation pattern' }
    }

    return { success: true, data: { id: existing.id } }
  }

  const { data: inserted, error: insertError } = await db
    .from('confirmation_patterns')
    .insert({
      chef_id: tenantId,
      transition_from: pattern.transitionFrom,
      transition_to: pattern.transitionTo,
      severity: pattern.severity,
      message: pattern.message,
      requires_reason: pattern.requiresReason,
      cooldown_minutes: pattern.cooldownMinutes,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    log.events.error('Failed to insert confirmation pattern', { error: insertError })
    return { success: false, error: 'Failed to create confirmation pattern' }
  }

  return { success: true, data: { id: inserted.id } }
}

// ── Internal Helpers ──────────────────────────────────────────────────────

async function logRecoveryAttemptInternal(
  db: any,
  data: {
    eventId: string
    chefId: string
    optionId: string
    fromState: EventStatus
    toState: EventStatus
    reason: string | null
    outcome: 'success' | 'failed' | 'cancelled'
  }
): Promise<void> {
  try {
    await db.from('recovery_attempts').insert({
      event_id: data.eventId,
      chef_id: data.chefId,
      option_id: data.optionId,
      from_state: data.fromState,
      to_state: data.toState,
      reason: data.reason,
      outcome: data.outcome,
    })
  } catch (err) {
    log.events.warn('Failed to log recovery attempt (non-blocking)', { error: err })
  }
}
