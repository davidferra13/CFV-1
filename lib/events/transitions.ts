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
 * Logs to event_state_transitions table (append-only)
 */
export async function transitionEvent({
  eventId,
  toStatus,
  metadata = {},
  systemTransition = false
}: {
  eventId: string
  toStatus: EventStatus
  metadata?: Record<string, unknown>
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

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    status: toStatus,
    updated_by: transitionedBy
  }

  // Add cancellation-specific fields
  if (toStatus === 'cancelled') {
    updatePayload.cancelled_at = new Date().toISOString()
    updatePayload.cancellation_reason = (metadata.reason as string) || null
    // Determine initiator based on who triggered it
    if (systemTransition) {
      updatePayload.cancellation_initiated_by = 'mutual'
    } else if (user?.role === 'chef') {
      updatePayload.cancellation_initiated_by = 'chef'
    } else if (user?.role === 'client') {
      updatePayload.cancellation_initiated_by = 'client'
    }
  }

  // Update event status
  const { error: updateError } = await supabase
    .from('events')
    .update(updatePayload)
    .eq('id', eventId)

  if (updateError) {
    console.error('[transitionEvent] Update error:', updateError)
    throw new Error('Failed to update event status')
  }

  // Log transition (immutable audit trail)
  const { error: logError } = await supabase
    .from('event_state_transitions')
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

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/my-events/${eventId}`)

  // Post system message to linked chat conversation (non-blocking)
  try {
    const { postEventSystemMessage } = await import('@/lib/chat/system-messages')
    await postEventSystemMessage(eventId, fromStatus, toStatus)
  } catch (err) {
    console.error('[transitionEvent] System message post failed (non-blocking):', err)
  }

  // Create chef notification for client-initiated or system transitions (non-blocking)
  try {
    const notifyChef =
      (toStatus === 'accepted' && fromStatus === 'proposed') ||
      (toStatus === 'paid' && fromStatus === 'accepted') ||
      (toStatus === 'cancelled' && !systemTransition && user?.role === 'client')

    if (notifyChef) {
      const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
      const chefUserId = await getChefAuthUserId(event.tenant_id)

      if (chefUserId) {
        const eventTitle = event.occasion || 'Untitled event'
        const notifications: Record<string, { action: string; title: string; body: string }> = {
          accepted: {
            action: 'proposal_accepted',
            title: `Proposal accepted`,
            body: `Your proposal for "${eventTitle}" was accepted by the client`,
          },
          paid: {
            action: 'event_paid',
            title: `Payment received`,
            body: `Payment received for "${eventTitle}"`,
          },
          cancelled: {
            action: 'event_cancelled',
            title: `Event cancelled`,
            body: `"${eventTitle}" was cancelled by the client`,
          },
        }

        const notif = notifications[toStatus]
        if (notif) {
          await createNotification({
            tenantId: event.tenant_id,
            recipientId: chefUserId,
            category: toStatus === 'paid' ? 'payment' : 'event',
            action: notif.action as any,
            title: notif.title,
            body: notif.body,
            actionUrl: `/events/${eventId}`,
            eventId,
            clientId: event.client_id,
          })
        }
      }
    }
  } catch (err) {
    console.error('[transitionEvent] Notification creation failed (non-blocking):', err)
  }

  // Send transactional emails (non-blocking)
  try {
    const supabaseAdmin = createServerClient({ admin: true })

    // Fetch client details for email
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('email, full_name')
      .eq('id', event.client_id)
      .single()

    // Fetch chef name
    const { data: chef } = await supabaseAdmin
      .from('chefs')
      .select('business_name')
      .eq('id', event.tenant_id)
      .single()

    if (client?.email && chef) {
      const { sendEventProposedEmail, sendEventConfirmedEmail, sendEventCompletedEmail, sendEventCancelledEmail, buildLocation } = await import('@/lib/email/notifications')
      const chefName = chef.business_name || 'Your Chef'
      const occasion = event.occasion || 'Untitled event'
      const location = buildLocation(event)

      if (toStatus === 'proposed' && fromStatus === 'draft') {
        await sendEventProposedEmail({
          clientEmail: client.email,
          clientName: client.full_name,
          chefName,
          eventId,
          occasion,
          eventDate: event.event_date,
          guestCount: event.guest_count,
          location,
        })
      }

      if (toStatus === 'confirmed' && fromStatus === 'paid') {
        await sendEventConfirmedEmail({
          clientEmail: client.email,
          clientName: client.full_name,
          chefName,
          occasion,
          eventDate: event.event_date,
          serveTime: event.serve_time,
          location,
          guestCount: event.guest_count,
        })
      }

      if (toStatus === 'completed' && fromStatus === 'in_progress') {
        await sendEventCompletedEmail({
          clientEmail: client.email,
          clientName: client.full_name,
          chefName,
          eventId,
          occasion,
          eventDate: event.event_date,
        })
      }

      if (toStatus === 'cancelled') {
        await sendEventCancelledEmail({
          recipientEmail: client.email,
          recipientName: client.full_name,
          occasion,
          eventDate: event.event_date,
          cancelledBy: user?.role === 'chef' ? chefName : 'the client',
          reason: (metadata.reason as string) || null,
        })
      }
    }
  } catch (emailErr) {
    console.error('[transitionEvent] Email send failed (non-blocking):', emailErr)
  }

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const eventTitle = event.occasion || 'Untitled event'
    await logChefActivity({
      tenantId: event.tenant_id,
      actorId: transitionedBy || 'system',
      action: toStatus === 'cancelled' ? 'event_cancelled' : 'event_transitioned',
      domain: 'event',
      entityType: 'event',
      entityId: eventId,
      summary: `Moved "${eventTitle}" from ${fromStatus} → ${toStatus}`,
      context: { from_status: fromStatus, to_status: toStatus, occasion: eventTitle, client_id: event.client_id },
      clientId: event.client_id,
    })
  } catch (err) {
    console.error('[transitionEvent] Activity log failed (non-blocking):', err)
  }

  // Fire automations (non-blocking)
  try {
    const { evaluateAutomations } = await import('@/lib/automations/engine')
    await evaluateAutomations(event.tenant_id, 'event_status_changed', {
      entityId: eventId,
      entityType: 'event',
      fields: {
        from_status: fromStatus,
        to_status: toStatus,
        status: toStatus,
        occasion: event.occasion || null,
        client_id: event.client_id,
      },
    })
  } catch (err) {
    console.error('[transitionEvent] Automation evaluation failed (non-blocking):', err)
  }

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
 * Auto-awards loyalty points as a side effect
 */
export async function completeEvent(eventId: string) {
  const user = await requireChef()

  const result = await transitionEvent({
    eventId,
    toStatus: 'completed',
    metadata: { action: 'chef_completed', chefId: user.entityId }
  })

  // Auto-award loyalty points (Tier 1 autonomous — no chef approval needed)
  try {
    const { awardEventPoints } = await import('@/lib/loyalty/actions')
    const loyaltyResult = await awardEventPoints(eventId)
    return { ...result, loyalty: loyaltyResult }
  } catch (err) {
    // Loyalty award failure should not block event completion
    console.error('[completeEvent] Loyalty award failed (non-blocking):', err)
    return { ...result, loyalty: null }
  }
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
