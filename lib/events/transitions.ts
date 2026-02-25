// Event Lifecycle State Machine
// Enforces System Law #4: Finite state transitions, server-side validation

'use server'

import { requireChef, requireClient, getCurrentUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { TransitionEventInputSchema } from '@/lib/validation/schemas'

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
  draft: ['proposed', 'paid', 'cancelled'],
  proposed: ['accepted', 'cancelled'],
  accepted: ['paid', 'cancelled'],
  paid: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
}

// Who can trigger each transition
type TransitionPermission = 'chef' | 'client' | 'system'

const TRANSITION_PERMISSIONS: Record<string, TransitionPermission | TransitionPermission[]> = {
  'draft->proposed': 'chef',
  'proposed->accepted': 'client',
  'proposed->cancelled': ['chef', 'client'],
  'accepted->cancelled': ['chef', 'client'],
  'accepted->paid': 'system', // Stripe webhook only
  'draft->paid': 'system', // Instant-book: Stripe webhook transitions draft directly to paid
  'paid->confirmed': 'chef',
  'confirmed->in_progress': 'chef',
  'in_progress->completed': 'chef',
  '*->cancelled': 'chef', // Chef can cancel anytime
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
  systemTransition = false,
}: {
  eventId: string
  toStatus: EventStatus
  metadata?: Record<string, unknown>
  systemTransition?: boolean // True if called from webhook
}) {
  // Validate inputs before any DB access
  const parsed = TransitionEventInputSchema.parse({ eventId, toStatus, metadata, systemTransition })
  const supabase = createServerClient({ admin: parsed.systemTransition })

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
      TRANSITION_PERMISSIONS[transitionKey] || TRANSITION_PERMISSIONS[cancellationKey]

    if (!requiredRole) {
      throw new Error('Transition permission is not configured')
    }

    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

    if (!allowedRoles.includes(user.role as TransitionPermission)) {
      if (allowedRoles.includes('system')) {
        throw new Error('This transition can only be triggered by system (webhook)')
      }

      const rolesLabel = allowedRoles.join(' or ')
      throw new Error(`${rolesLabel} permission required for this transition`)
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

  // ── Readiness Gate Check (pre-transition) ────────────────────────────────
  // Evaluate gates for this transition. Hard blocks (e.g., unconfirmed anaphylaxis)
  // throw and abort. Soft warnings are logged in metadata but do not block.
  // System transitions (Stripe webhooks) skip readiness checks.
  let readinessWarnings: string[] = []
  if (!systemTransition) {
    try {
      const { evaluateReadinessForTransition } = await import('@/lib/events/readiness')
      const readiness = await evaluateReadinessForTransition(eventId, fromStatus, toStatus)

      if (readiness.hardBlocked) {
        const hardBlockerDescriptions = readiness.blockers
          .filter((b) => b.isHardBlock)
          .map((b) => b.details || b.label)
          .join('; ')
        throw new Error(`Cannot proceed: ${hardBlockerDescriptions}`)
      }

      // Collect soft warnings for metadata
      readinessWarnings = readiness.blockers.filter((b) => !b.isHardBlock).map((b) => b.label)
    } catch (readinessErr: any) {
      // Re-throw hard blocks; swallow infrastructure errors (non-blocking)
      if (readinessErr.message?.startsWith('Cannot proceed:')) {
        throw readinessErr
      }
      log.events.warn('Readiness check failed (non-blocking)', { error: readinessErr })
    }
  }

  // Atomically update event status + insert transition audit log in one DB transaction.
  // transition_event_atomic() is a SECURITY DEFINER Postgres function that handles:
  //   - events.status, events.updated_by, events.cancelled_at, events.cancellation_reason,
  //     events.cancellation_initiated_by (for cancellations)
  //   - event_state_transitions INSERT (both writes are atomic — one commit or both roll back)
  const transitionMetadata = {
    ...parsed.metadata,
    source: parsed.systemTransition ? 'system' : 'user',
    actor_role: user?.role ?? null,
    ...(readinessWarnings.length > 0 && { readiness_warnings: readinessWarnings }),
  }

  const { error: transitionError } = await supabase.rpc('transition_event_atomic', {
    p_event_id: parsed.eventId,
    p_to_status: parsed.toStatus,
    p_from_status: fromStatus,
    p_transitioned_by: transitionedBy ?? '00000000-0000-0000-0000-000000000000',
    p_tenant_id: event.tenant_id,
    p_metadata: transitionMetadata,
  })

  if (transitionError) {
    log.events.error('Atomic transition failed', { error: transitionError })
    throw new Error('Failed to transition event status')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/my-events/${eventId}`)

  // Post system message to linked chat conversation (non-blocking)
  try {
    const { postEventSystemMessage } = await import('@/lib/chat/system-messages')
    await postEventSystemMessage(eventId, fromStatus, toStatus)
  } catch (err) {
    log.events.warn('System message post failed (non-blocking)', { error: err })
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
    log.events.warn('Chef notification creation failed (non-blocking)', { error: err })
  }

  // Create client notification for chef-initiated transitions (non-blocking)
  try {
    const notifyClient =
      (toStatus === 'proposed' && fromStatus === 'draft') ||
      (toStatus === 'confirmed' && fromStatus === 'paid')

    if (notifyClient && event.client_id) {
      const { createClientNotification } = await import('@/lib/notifications/client-actions')
      const eventTitle = event.occasion || 'Untitled event'

      if (toStatus === 'proposed') {
        await createClientNotification({
          tenantId: event.tenant_id,
          clientId: event.client_id,
          category: 'event',
          action: 'event_proposed_to_client',
          title: 'New event proposal',
          body: `You have a new proposal for "${eventTitle}"`,
          actionUrl: `/my-events/${eventId}`,
          eventId,
        })
      }

      if (toStatus === 'confirmed') {
        await createClientNotification({
          tenantId: event.tenant_id,
          clientId: event.client_id,
          category: 'event',
          action: 'event_confirmed_to_client',
          title: 'Event confirmed',
          body: `"${eventTitle}" is confirmed — everything is set`,
          actionUrl: `/my-events/${eventId}`,
          eventId,
        })
      }
    }
  } catch (err) {
    log.events.warn('Client notification failed (non-blocking)', { error: err })
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
      .select('business_name, email')
      .eq('id', event.tenant_id)
      .single()

    if (client?.email && chef) {
      const {
        sendEventProposedEmail,
        sendEventConfirmedEmail,
        sendEventCompletedEmail,
        sendEventCancelledEmail,
        sendEventStartingEmail,
        sendFrontOfHouseMenuReadyEmail,
        sendPrepSheetReadyEmail,
        buildLocation,
      } = await import('@/lib/email/notifications')
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
          eventId,
        })

        // Persist an FOH HTML render for the linked event menu (non-blocking).
        try {
          const { data: eventMenu } = await supabaseAdmin
            .from('menus')
            .select('id')
            .eq('event_id', eventId)
            .eq('tenant_id', event.tenant_id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (eventMenu?.id) {
            const lowerOccasion = (event.occasion ?? '').toLowerCase()
            const eventType = /birthday/.test(lowerOccasion)
              ? 'birthday'
              : /bachelorette/.test(lowerOccasion)
                ? 'bachelorette_party'
                : /anniversary/.test(lowerOccasion)
                  ? 'anniversary'
                  : /christmas|hanukkah|valentine|easter|halloween/.test(lowerOccasion)
                    ? 'holiday'
                    : /corporate/.test(lowerOccasion)
                      ? 'corporate_event'
                      : 'regular_menu'

            const { generateAndSaveFrontOfHouseMenu } =
              await import('@/lib/front-of-house/menuGeneratorService')
            await generateAndSaveFrontOfHouseMenu({
              menuId: eventMenu.id,
              context: {
                hostName: client.full_name ?? undefined,
                eventType,
                specialNote: event.occasion ?? undefined,
              },
            })
          }
        } catch (fohPersistErr) {
          log.events.warn('FOH HTML auto-save failed (non-blocking)', { error: fohPersistErr })
        }

        // Auto-send printable FOH menu PDF to both client and chef.
        // Non-blocking to event transition if PDF generation/send fails.
        try {
          const { format } = await import('date-fns')
          const { generateFrontOfHouseMenu } =
            await import('@/lib/documents/generate-front-of-house-menu')
          const fohPdf = await generateFrontOfHouseMenu(eventId)
          const dateSuffix = format(new Date(), 'yyyy-MM-dd')
          const recipients = Array.from(new Set([client.email, chef.email].filter(Boolean)))

          if (recipients.length > 0) {
            await sendFrontOfHouseMenuReadyEmail({
              to: recipients,
              clientName: client.full_name,
              chefName,
              occasion,
              eventDate: event.event_date,
              pdfFilename: `front-of-house-menu-${dateSuffix}.pdf`,
              pdfBuffer: fohPdf,
            })
          }
        } catch (fohErr) {
          log.events.warn('FOH menu auto-send failed (non-blocking)', { error: fohErr })
        }

        // Auto-send prep sheet PDF to chef only (non-blocking).
        // Prep sheet is chef-internal — client never sees it.
        try {
          const { format } = await import('date-fns')
          const { generatePrepSheet } = await import('@/lib/documents/generate-prep-sheet')
          const prepPdf = await generatePrepSheet(eventId)
          const dateSuffix = format(new Date(), 'yyyy-MM-dd')

          if (chef.email) {
            await sendPrepSheetReadyEmail({
              to: chef.email,
              clientName: client.full_name,
              chefName,
              occasion,
              eventDate: event.event_date,
              pdfFilename: `prep-sheet-${dateSuffix}.pdf`,
              pdfBuffer: prepPdf,
            })
          }
        } catch (prepErr) {
          log.events.warn('Prep sheet auto-send failed (non-blocking)', { error: prepErr })
        }
      }

      if (toStatus === 'in_progress' && fromStatus === 'confirmed') {
        await sendEventStartingEmail({
          clientEmail: client.email,
          clientName: client.full_name,
          chefName,
          occasion,
          eventDate: event.event_date,
          arrivalTime: event.arrival_time ?? null,
          serveTime: event.serve_time ?? null,
          location,
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
    log.events.warn('Email send failed (non-blocking)', { error: emailErr })
  }

  // Create post-event survey and email client (non-blocking)
  if (toStatus === 'completed' && fromStatus === 'in_progress') {
    try {
      const supabaseAdmin = createServerClient({ admin: true })
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('email, full_name')
        .eq('id', event.client_id)
        .single()

      const { data: chef } = await supabaseAdmin
        .from('chefs')
        .select('business_name')
        .eq('id', event.tenant_id)
        .single()

      const { createSurveyForEvent } = await import('@/lib/surveys/actions')
      const surveyToken = await createSurveyForEvent(eventId, event.tenant_id)

      if (surveyToken && client?.email) {
        const { sendPostEventSurveyEmail } = await import('@/lib/email/notifications')
        const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/survey/${surveyToken}`
        await sendPostEventSurveyEmail({
          clientEmail: client.email,
          clientName: client.full_name,
          chefName: chef?.business_name || 'Your Chef',
          occasion: event.occasion || 'your event',
          surveyUrl,
        })
      }
    } catch (surveyErr) {
      log.events.warn('Survey creation failed (non-blocking)', { error: surveyErr })
    }
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
      context: {
        from_status: fromStatus,
        to_status: toStatus,
        occasion: eventTitle,
        client_id: event.client_id,
      },
      clientId: event.client_id,
    })
  } catch (err) {
    log.events.warn('Activity log failed (non-blocking)', { error: err })
  }

  // Auto-create draft service travel legs when confirmed (non-blocking, idempotent)
  // Creates service_travel + return_home legs pre-filled from event location + chef home address.
  // Chef reviews and confirms them from the Travel Plan tab.
  if (toStatus === 'confirmed') {
    try {
      const { autoCreateServiceLegs } = await import('@/lib/travel/actions')
      await autoCreateServiceLegs(eventId)
    } catch (err) {
      log.events.warn('Auto-create service legs failed (non-blocking)', { error: err })
    }
  }

  // Auto-place prep blocks when confirmed (non-blocking, idempotent).
  // Uses deterministic rule-based engine — not AI output. Skips if blocks exist.
  if (toStatus === 'confirmed') {
    try {
      const { autoPlacePrepBlocks } = await import('@/lib/scheduling/prep-block-actions')
      await autoPlacePrepBlocks(eventId)
    } catch (err) {
      log.events.warn('Auto-place prep blocks failed (non-blocking)', { error: err })
    }
  }

  // Sync to Google Calendar when confirmed; delete when cancelled (non-blocking).
  if (toStatus === 'confirmed') {
    try {
      const { syncEventToGoogleCalendar } = await import('@/lib/scheduling/calendar-sync')
      await syncEventToGoogleCalendar(eventId)
    } catch (err) {
      log.events.warn('Google Calendar sync failed (non-blocking)', { error: err })
    }
  }
  if (toStatus === 'cancelled') {
    try {
      const { deleteEventFromGoogleCalendar } = await import('@/lib/scheduling/calendar-sync')
      await deleteEventFromGoogleCalendar(eventId)
    } catch (err) {
      log.events.warn('Google Calendar delete failed (non-blocking)', { error: err })
    }
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
    log.events.warn('Automation evaluation failed (non-blocking)', { error: err })
  }

  // Enqueue Remy reactive AI tasks (non-blocking)
  try {
    if (toStatus === 'confirmed') {
      const { onEventConfirmed } = await import('@/lib/ai/reactive/hooks')
      await onEventConfirmed(event.tenant_id, eventId, event.client_id)
    } else if (toStatus === 'completed') {
      const { onEventCompleted } = await import('@/lib/ai/reactive/hooks')
      await onEventCompleted(event.tenant_id, eventId, event.client_id)
    } else if (toStatus === 'cancelled') {
      const { onEventCancelled } = await import('@/lib/ai/reactive/hooks')
      await onEventCancelled(event.tenant_id, eventId, event.client_id)
    }
  } catch (err) {
    log.events.warn('Remy reactive enqueue failed (non-blocking)', { error: err })
  }

  return {
    success: true,
    fromStatus,
    toStatus,
    warnings: readinessWarnings, // Soft gates that were bypassed (logged, not blocked)
  }
}

/**
 * Chef proposes event to client
 */
export async function proposeEvent(eventId: string) {
  const user = await requireChef()

  return transitionEvent({
    eventId,
    toStatus: 'proposed',
    metadata: { action: 'chef_proposed', chefId: user.entityId },
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
    metadata: { action: 'client_accepted', clientId: user.entityId },
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
    metadata: { action: 'chef_confirmed', chefId: user.entityId },
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
    metadata: { action: 'chef_started', chefId: user.entityId },
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
    metadata: { action: 'chef_completed', chefId: user.entityId },
  })

  // Auto-award loyalty points (Tier 1 autonomous — no chef approval needed)
  try {
    const { awardEventPoints } = await import('@/lib/loyalty/actions')
    const loyaltyResult = await awardEventPoints(eventId)
    return { ...result, loyalty: loyaltyResult }
  } catch (err) {
    // Loyalty award failure should not block event completion
    log.events.warn('Loyalty award failed (non-blocking)', { error: err })
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
      chefId: user.entityId,
    },
  })
}
