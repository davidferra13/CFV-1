// Event Lifecycle State Machine
// Enforces System Law #4: Finite state transitions, server-side validation

'use server'

import { requireChef, requireClient, getCurrentUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type EventStatus =
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'paid'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

// Valid state transitions (from -> to[])
const TRANSITION_RULES: Record<EventStatus, EventStatus[]> = {
  draft: ['proposed', 'cancelled'],
  proposed: ['accepted', 'cancelled'],
  accepted: ['paid', 'cancelled'],
  paid: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // Terminal state
  cancelled: [] // Terminal state
}

// Who can trigger each transition
type TransitionPermission = 'chef' | 'client' | 'system'

const TRANSITION_PERMISSIONS: Record<string, TransitionPermission> = {
  'draft->proposed': 'chef',
  'proposed->accepted': 'client',
  'accepted->paid': 'system', // Stripe webhook only
  'paid->confirmed': 'chef',
  'confirmed->in_progress': 'chef',
  'in_progress->completed': 'chef',
  '*->cancelled': 'chef' // Chef can cancel anytime
}

/**
 * Core state transition function
 * Validates transition rules and permissions
 * Logs to event_transitions table (append-only)
 */
export async function transitionEvent({
  eventId,
  toStatus,
  metadata = {},
  systemTransition = false
}: {
  eventId: string
  toStatus: EventStatus
  metadata?: Record<string, any>
  systemTransition?: boolean // True if called from webhook
}) {
  const supabase = createServerClient({ admin: systemTransition })

  // Fetch current event
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    throw new Error('Event not found')
  }

  const fromStatus = event.status as EventStatus

  // Validate transition is allowed
  const allowedTransitions = TRANSITION_RULES[fromStatus]
  if (!allowedTransitions.includes(toStatus)) {
    throw new Error(
      `Invalid transition from ${fromStatus} to ${toStatus}. Allowed: ${allowedTransitions.join(', ')}`
    )
  }

  // Check permissions (unless system transition)
  if (!systemTransition) {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Authentication required')
    }

    const transitionKey = `${fromStatus}->${toStatus}`
    const cancellationKey = '*->cancelled'
    const requiredRole =
      TRANSITION_PERMISSIONS[transitionKey] ||
      TRANSITION_PERMISSIONS[cancellationKey]

    if (requiredRole === 'chef' && user.role !== 'chef') {
      throw new Error('Chef permission required for this transition')
    }

    if (requiredRole === 'client' && user.role !== 'client') {
      throw new Error('Client permission required for this transition')
    }

    if (requiredRole === 'system') {
      throw new Error('This transition can only be triggered by system (webhook)')
    }

    // Verify tenant/client ownership
    if (user.role === 'chef' && user.tenantId !== event.tenant_id) {
      throw new Error('Event does not belong to your tenant')
    }

    if (user.role === 'client' && user.entityId !== event.client_id) {
      throw new Error('Event does not belong to you')
    }
  }

  // Get current user ID (null if system)
  const user = systemTransition ? null : await getCurrentUser()
  const transitionedBy = user?.id || null

  // Update event status
  const { error: updateError } = await supabase
    .from('events')
    .update({
      status: toStatus,
      status_changed_at: new Date().toISOString(),
      updated_by: transitionedBy,
      ...(toStatus === 'cancelled' && {
        cancelled_at: new Date().toISOString(),
        cancelled_by: transitionedBy,
        cancellation_reason: metadata.reason || null
      })
    })
    .eq('id', eventId)

  if (updateError) {
    console.error('[transitionEvent] Update error:', updateError)
    throw new Error('Failed to update event status')
  }

  // Log transition (immutable audit trail)
  const { error: logError } = await supabase
    .from('event_transitions')
    .insert({
      tenant_id: event.tenant_id,
      event_id: eventId,
      from_status: fromStatus,
      to_status: toStatus,
      transitioned_by: transitionedBy,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        source: systemTransition ? 'system' : 'user'
      }
    })

  if (logError) {
    console.error('[transitionEvent] Log error:', logError)
    // Don't throw - transition succeeded, logging failed
  }

  revalidatePath(`/chef/events/${eventId}`)
  revalidatePath(`/client/my-events/${eventId}`)
  return { success: true, fromStatus, toStatus }
}

/**
 * Chef proposes event to client
 */
export async function proposeEvent(eventId: string) {
  const user = await requireChef()

  return transitionEvent({
    eventId,
    toStatus: 'proposed',
    metadata: { action: 'chef_proposed', chefId: user.entityId }
  })
}

/**
 * Client accepts proposal
 */
export async function acceptProposal(eventId: string) {
  const user = await requireClient()

  return transitionEvent({
    eventId,
    toStatus: 'accepted',
    metadata: { action: 'client_accepted', clientId: user.entityId }
  })
}

/**
 * Chef confirms event after payment received
 */
export async function confirmEvent(eventId: string) {
  const user = await requireChef()

  // TODO: Verify payment via ledger before allowing confirmation
  // For now, allow confirmation from 'paid' status

  return transitionEvent({
    eventId,
    toStatus: 'confirmed',
    metadata: { action: 'chef_confirmed', chefId: user.entityId }
  })
}

/**
 * Chef marks event as in progress
 */
export async function startEvent(eventId: string) {
  const user = await requireChef()

  return transitionEvent({
    eventId,
    toStatus: 'in_progress',
    metadata: { action: 'chef_started', chefId: user.entityId }
  })
}

/**
 * Chef completes event
 */
export async function completeEvent(eventId: string) {
  const user = await requireChef()

  return transitionEvent({
    eventId,
    toStatus: 'completed',
    metadata: { action: 'chef_completed', chefId: user.entityId }
  })
}

/**
 * Chef cancels event (with reason)
 */
export async function cancelEvent(eventId: string, reason: string) {
  const user = await requireChef()

  return transitionEvent({
    eventId,
    toStatus: 'cancelled',
    metadata: {
      action: 'chef_cancelled',
      reason,
      chefId: user.entityId
    }
  })
}
