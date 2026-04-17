// Event Lifecycle State Machine
// Enforces System Law #4: Finite state transitions, server-side validation

'use server'

import { requireChef, requireClient, getCurrentUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { log } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { TransitionEventInputSchema, type TransitionActorContext } from '@/lib/validation/schemas'
import { dateToDateString } from '@/lib/utils/format'

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
  'proposed->accepted': ['client', 'chef'], // Chef can accept on behalf (verbal confirmation)
  'proposed->cancelled': ['chef', 'client'],
  'accepted->cancelled': ['chef', 'client'],
  'accepted->paid': ['system', 'chef'], // Stripe webhook or chef marks paid offline
  'draft->paid': ['system', 'chef'], // Instant-book: Stripe webhook or chef marks paid offline
  'paid->confirmed': 'chef',
  'confirmed->in_progress': 'chef',
  'in_progress->completed': 'chef',
  '*->cancelled': 'chef', // Chef can cancel anytime
}

async function runCompletedEventPostProcessing(eventId: string, tenantId: string) {
  try {
    const { getLoyaltyConfigByTenant, awardEventPoints, awardLiteVisit } =
      await import('@/lib/loyalty/actions')
    const config = await getLoyaltyConfigByTenant(tenantId)

    if (config && config.is_active && config.program_mode !== 'off') {
      if (config.program_mode === 'lite') {
        await awardLiteVisit(eventId)
      } else {
        await awardEventPoints(eventId)
      }
    }
  } catch (err) {
    log.events.warn('Loyalty award failed (non-blocking)', { error: err })
  }

  try {
    const { snapshotEventToHub } = await import('@/lib/hub/integration-actions')
    await snapshotEventToHub({ eventId, tenantId })
  } catch (err) {
    log.events.warn('Hub event snapshot failed (non-blocking)', { error: err })
  }
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
  actorContext,
}: {
  eventId: string
  toStatus: EventStatus
  metadata?: Record<string, unknown>
  systemTransition?: boolean // True if called from webhook
  actorContext?: TransitionActorContext
}) {
  // Validate inputs before any DB access
  const parsed = TransitionEventInputSchema.parse({
    eventId,
    toStatus,
    metadata,
    systemTransition,
    actorContext,
  })
  const isSystemTransition = parsed.systemTransition || parsed.actorContext?.role === 'system'
  const db = createServerClient({ admin: isSystemTransition })

  // Fetch current event
  const { data: event, error: fetchError } = await db
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    throw new Error('Event not found')
  }

  const fromStatus = event.status as EventStatus

  let actor: TransitionActorContext | null = parsed.actorContext ?? null

  if (!actor && !isSystemTransition) {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    actor = {
      id: currentUser.id,
      role: currentUser.role as TransitionPermission,
      entityId: currentUser.entityId,
      tenantId: currentUser.tenantId ?? null,
    }
  }

  // Idempotency: already in target state is a no-op, not an error
  if (fromStatus === toStatus) {
    return event
  }

  // Validate transition is allowed
  const allowedTransitions = TRANSITION_RULES[fromStatus]
  if (!allowedTransitions.includes(toStatus)) {
    throw new Error(
      `Invalid transition from ${fromStatus} to ${toStatus}. Allowed: ${allowedTransitions.join(', ')}`
    )
  }

  // Check permissions (unless system transition)
  if (!isSystemTransition) {
    if (!actor) {
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

    if (!allowedRoles.includes(actor.role as TransitionPermission)) {
      if (allowedRoles.includes('system')) {
        throw new Error('This transition can only be triggered by system (webhook)')
      }

      const rolesLabel = allowedRoles.join(' or ')
      throw new Error(`${rolesLabel} permission required for this transition`)
    }

    // Verify tenant/client ownership
    if (actor.role === 'chef' && actor.tenantId !== event.tenant_id) {
      throw new Error('Event does not belong to your tenant')
    }

    if (actor.role === 'client' && actor.entityId !== event.client_id) {
      throw new Error('Event does not belong to you')
    }
  }

  const transitionedBy = actor?.id || null

  // ── Readiness Gate Check (pre-transition) ────────────────────────────────
  // Evaluate gates for this transition. Hard blocks (e.g., unconfirmed anaphylaxis)
  // throw and abort for chef-initiated transitions. Soft warnings are logged in
  // metadata but do not block.
  // System transitions (Stripe webhooks) run readiness checks but never block -
  // payment must always land. Hard blocks become warnings recorded in metadata. (Q18 fix)
  let readinessWarnings: string[] = []
  {
    try {
      const { evaluateReadinessForTransition } = await import('@/lib/events/readiness')
      const readiness = await evaluateReadinessForTransition(eventId, fromStatus, toStatus)

      if (readiness.hardBlocked) {
        if (isSystemTransition) {
          // System transitions: record hard blocks as warnings but proceed (Q18 fix)
          const hardBlockLabels = readiness.blockers
            .filter((b) => b.isHardBlock)
            .map((b) => b.details || b.label)
          log.events.warn('System transition bypassed hard readiness blocks', {
            context: { eventId, fromStatus, toStatus, hardBlocks: hardBlockLabels },
          })
          readinessWarnings.push(...hardBlockLabels.map((l) => `[SYSTEM BYPASS] ${l}`))
        } else {
          const hardBlockerDescriptions = readiness.blockers
            .filter((b) => b.isHardBlock)
            .map((b) => b.details || b.label)
            .join('; ')
          throw new Error(`Cannot proceed: ${hardBlockerDescriptions}`)
        }
      }

      // Collect soft warnings for metadata
      readinessWarnings.push(
        ...readiness.blockers.filter((b) => !b.isHardBlock).map((b) => b.label)
      )
    } catch (readinessErr: any) {
      // Re-throw hard blocks (e.g., unconfirmed anaphylaxis)
      if (readinessErr.message?.startsWith('Cannot proceed:')) {
        throw readinessErr
      }
      // Infrastructure errors: log at error level and record in transition metadata
      // so the failure is visible, but don't hard-block on temporary DB blips (Q17 fix)
      log.events.error('Readiness evaluator crashed - transition proceeding without verification', {
        error: readinessErr,
        context: { eventId, fromStatus, toStatus },
      })
      readinessWarnings.push('Readiness check failed: gates could not be verified')
    }
  }

  // ── Same-date conflict check when confirming ────────────────────────────────
  // Soft warning only (no hard block). Chefs may legitimately have multiple events.
  // Returns a conflict notice as metadata for the UI to surface.
  if (toStatus === 'confirmed' && !isSystemTransition) {
    try {
      const db: any = createServerClient()
      const { data: conflicts } = await db
        .from('events')
        .select('id, occasion, event_date')
        .eq('tenant_id', event.tenant_id)
        .eq('event_date', event.event_date)
        .in('status', ['confirmed', 'in_progress'])
        .neq('id', eventId)

      if (conflicts && conflicts.length > 0) {
        const conflictNames = conflicts.map((c: any) => c.occasion || 'Untitled event').join(', ')
        readinessWarnings.push(`Same-day conflict: ${conflictNames} is also confirmed on this date`)
      }
    } catch (err) {
      log.events.warn('Conflict check failed (non-blocking)', { error: err })
    }
  }

  // Backfill pricing_model if transitioning to a payable status and it's missing.
  // The DB constraint events_payable_status_requires_pricing enforces pricing_model NOT NULL
  // for statuses >= accepted. Events created before the constraint may be missing this field.
  const PAYABLE_STATUSES: EventStatus[] = [
    'accepted',
    'paid',
    'confirmed',
    'in_progress',
    'completed',
  ]
  if (PAYABLE_STATUSES.includes(toStatus) && event.quoted_price_cents > 0 && !event.pricing_model) {
    try {
      await db.from('events').update({ pricing_model: 'flat_rate' }).eq('id', eventId)
      log.events.info('Backfilled missing pricing_model to flat_rate', { context: { eventId } })
    } catch (err) {
      log.events.warn('pricing_model backfill failed (non-blocking)', { error: err })
    }
  }

  // Atomically update event status + insert transition audit log in one DB transaction.
  // transition_event_atomic() is a SECURITY DEFINER Postgres function that handles:
  //   - events.status, events.updated_by, events.cancelled_at, events.cancellation_reason,
  //     events.cancellation_initiated_by (for cancellations)
  //   - event_state_transitions INSERT (both writes are atomic - one commit or both roll back)
  const sourceOverride =
    typeof parsed.metadata.source === 'string' ? parsed.metadata.source.trim() : ''
  const transitionMetadata = {
    ...parsed.metadata,
    source:
      sourceOverride || (isSystemTransition ? 'system' : parsed.actorContext ? 'api' : 'user'),
    actor_role: actor?.role ?? null,
    ...(readinessWarnings.length > 0 && { readiness_warnings: readinessWarnings }),
  }

  const { error: transitionError } = await db.rpc('transition_event_atomic', {
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

  // Idempotency guard: re-fetch the event to confirm our write actually landed.
  // Two concurrent requests can both pass auth/permission/readiness checks before
  // the atomic RPC rejects the second one. If the status doesn't match toStatus,
  // another request won the race - skip all side effects to prevent duplicate
  // emails, notifications, and PDFs.
  const { data: verifiedEvent } = await db
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single()

  if (verifiedEvent?.status !== toStatus) {
    log.events.warn('Transition race lost - another request changed status first', {
      context: { eventId, expected: toStatus, actual: verifiedEvent?.status },
    })
    // Revalidate so UI reflects the winner's state
    revalidatePath(`/events/${eventId}`)
    revalidatePath('/events')
    revalidatePath('/dashboard')
    revalidatePath('/finance')
    return {
      success: false,
      error: 'concurrent_modification',
      eventId,
      fromStatus,
      toStatus,
      actualStatus: verifiedEvent?.status,
    }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/my-events/${eventId}`)
  revalidatePath('/events')
  revalidatePath('/my-events')
  revalidatePath('/dashboard')
  revalidatePath('/finance')

  // Broadcast event status change so clients viewing the event page get a live refresh (non-blocking)
  try {
    const { broadcast } = await import('@/lib/realtime/sse-server')
    broadcast(`client-event:${eventId}`, 'status_changed', {
      eventId,
      fromStatus,
      toStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    log.events.warn('SSE broadcast for client event status failed (non-blocking)', { error: err })
  }

  // A3: Stamp menu food cost snapshot when chef proposes (draft -> proposed).
  // Captures the cost at quote-send time so ingredient price drift doesn't
  // silently change the displayed cost after the quote is out.
  if (toStatus === 'proposed' && fromStatus === 'draft') {
    try {
      const adminDb = createServerClient({ admin: true })
      const { data: costRow } = await (adminDb as any).rpc('compute_projected_food_cost_cents', {
        p_event_id: eventId,
      })
      const snapshotCents = typeof costRow === 'number' && costRow > 0 ? costRow : null
      await (adminDb as any)
        .from('events')
        .update({
          menu_cost_snapshot_cents: snapshotCents,
          menu_cost_snapshot_at: new Date().toISOString(),
        })
        .eq('id', eventId)
    } catch (err) {
      log.events.warn('Menu cost snapshot failed (non-blocking)', { error: err })
    }
  }

  // Auto-create Dinner Circle when event reaches 'paid' (non-blocking)
  // Ensures the coordination channel is ready the moment payment lands,
  // whether triggered by a Stripe webhook or a manual chef action.
  if (toStatus === 'paid') {
    try {
      const { ensureCircleForEvent } = await import('@/lib/hub/chef-circle-actions')
      await ensureCircleForEvent(eventId, event.tenant_id)
    } catch (err) {
      log.events.warn('Auto circle creation failed (non-blocking)', { error: err })
    }
  }

  // Q7: On cancellation with payments received, notify chef about pending refund
  if (toStatus === 'cancelled') {
    try {
      const { getEventFinancialSummary } = await import('@/lib/ledger/compute')
      const financials = await getEventFinancialSummary(eventId)
      const totalPaid = financials?.totalPaidCents ?? 0
      const totalRefunded = financials?.totalRefundedCents ?? 0
      const unrefunded = totalPaid - totalRefunded

      if (unrefunded > 0) {
        const { createNotification, getChefAuthUserId } =
          await import('@/lib/notifications/actions')
        const chefUserId = await getChefAuthUserId(event.tenant_id)
        if (chefUserId) {
          const amountStr = (unrefunded / 100).toFixed(2)
          await createNotification({
            tenantId: event.tenant_id,
            recipientId: chefUserId,
            category: 'payment',
            action: 'cancellation_pending_refund',
            title: 'Refund needed',
            body: `"${event.occasion || 'Event'}" was cancelled with $${amountStr} unrefunded. Process refund via Stripe or record offline refund.`,
            actionUrl: `/events/${eventId}`,
            eventId,
            clientId: event.client_id,
          })
        }
      }
    } catch (err) {
      log.events.warn('Cancellation refund notification failed (non-blocking)', { error: err })
    }
  }

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
      (toStatus === 'paid' && (fromStatus === 'accepted' || fromStatus === 'draft')) ||
      (toStatus === 'cancelled' && !isSystemTransition && actor?.role === 'client')

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
      (toStatus === 'confirmed' && fromStatus === 'paid') ||
      toStatus === 'paid' ||
      (toStatus === 'in_progress' && fromStatus === 'confirmed') ||
      (toStatus === 'completed' && fromStatus === 'in_progress') ||
      (toStatus === 'cancelled' && actor?.role !== 'client')

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
          body: `"${eventTitle}" is confirmed - everything is set`,
          actionUrl: `/my-events/${eventId}`,
          eventId,
        })
      }

      if (toStatus === 'paid') {
        await createClientNotification({
          tenantId: event.tenant_id,
          clientId: event.client_id,
          category: 'payment',
          action: 'event_paid_to_client',
          title: 'Payment confirmed',
          body: `Payment for "${eventTitle}" has been confirmed`,
          actionUrl: `/my-events/${eventId}`,
          eventId,
        })
      }

      if (toStatus === 'in_progress') {
        await createClientNotification({
          tenantId: event.tenant_id,
          clientId: event.client_id,
          category: 'event',
          action: 'event_in_progress_to_client',
          title: 'Your chef is on the way',
          body: `"${eventTitle}" is underway`,
          actionUrl: `/my-events/${eventId}`,
          eventId,
        })
      }

      if (toStatus === 'completed') {
        await createClientNotification({
          tenantId: event.tenant_id,
          clientId: event.client_id,
          category: 'event',
          action: 'event_completed_to_client',
          title: 'Event completed',
          body: `"${eventTitle}" is complete - thank you!`,
          actionUrl: `/my-events/${eventId}`,
          eventId,
        })
      }

      if (toStatus === 'cancelled') {
        await createClientNotification({
          tenantId: event.tenant_id,
          clientId: event.client_id,
          category: 'event',
          action: 'event_cancelled_to_client',
          title: 'Event cancelled',
          body: `"${eventTitle}" has been cancelled`,
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
    const dbAdmin = createServerClient({ admin: true })

    // Fetch client details for email
    const { data: client } = await dbAdmin
      .from('clients')
      .select('email, full_name')
      .eq('id', event.client_id)
      .single()

    // Fetch chef name
    const { data: chef } = await dbAdmin
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
          eventDate: dateToDateString(event.event_date as Date | string),
          guestCount: event.guest_count,
          location,
        })
      }

      if (toStatus === 'confirmed' && fromStatus === 'paid') {
        // Circle-first: post confirmation to circle, email points there
        try {
          const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
          const datePart = event.event_date
            ? ` for ${new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
            : ''
          await circleFirstNotify({
            eventId,
            notificationType: 'event_confirmed',
            body: `Event confirmed${datePart}! Prep is underway. I'll share the full plan here soon.`,
            metadata: {
              event_id: eventId,
              event_date: event.event_date,
              location,
              guest_count: event.guest_count,
            },
            actionUrl: `/my-events/${eventId}`,
            actionLabel: 'View Event Details',
            fallbackEmail: client.email
              ? {
                  to: client.email,
                  subject: `Event confirmed: ${occasion}`,
                  react: (await import('react')).createElement(
                    (await import('@/lib/email/templates/event-confirmed')).EventConfirmedEmail,
                    {
                      clientName: client.full_name,
                      chefName,
                      occasion,
                      eventDate: dateToDateString(event.event_date as Date | string),
                      serveTime: event.serve_time,
                      location,
                      guestCount: event.guest_count,
                      calendarUrl: `/my-events/${eventId}`,
                    } as any
                  ),
                }
              : undefined,
          })
        } catch (cfErr) {
          log.events.warn('Circle-first confirmed notify failed (non-blocking)', { error: cfErr })
          // Fallback: send the email directly (include circle link if available)
          let fallbackCircleUrl: string | undefined
          try {
            const { getCircleForEvent } = await import('@/lib/hub/circle-lookup')
            const circle = await getCircleForEvent(eventId)
            if (circle?.groupToken) {
              fallbackCircleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/hub/g/${circle.groupToken}`
            }
          } catch {
            // Non-blocking
          }
          await sendEventConfirmedEmail({
            clientEmail: client.email,
            clientName: client.full_name,
            chefName,
            occasion,
            eventDate: dateToDateString(event.event_date as Date | string),
            serveTime: event.serve_time,
            location,
            guestCount: event.guest_count,
            eventId,
            circleUrl: fallbackCircleUrl,
          })
        }

        // Persist an FOH HTML render for the linked event menu (non-blocking).
        try {
          const { data: eventMenu } = await dbAdmin
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
              eventDate: dateToDateString(event.event_date as Date | string),
              pdfFilename: `front-of-house-menu-${dateSuffix}.pdf`,
              pdfBuffer: fohPdf,
            })
          }
        } catch (fohErr) {
          log.events.warn('FOH menu auto-send failed (non-blocking)', { error: fohErr })
        }

        // Auto-send prep sheet PDF to chef only (non-blocking).
        // Prep sheet is chef-internal - client never sees it.
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
              eventDate: dateToDateString(event.event_date as Date | string),
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
          eventDate: dateToDateString(event.event_date as Date | string),
          arrivalTime: event.arrival_time ?? null,
          serveTime: event.serve_time ?? null,
          location,
        })
      }

      if (toStatus === 'completed' && fromStatus === 'in_progress') {
        // Fetch menu highlights for personalized thank-you email (non-blocking)
        let menuHighlights: string[] = []
        try {
          const { data: eventMenu } = await dbAdmin
            .from('menus')
            .select('id')
            .eq('event_id', eventId)
            .eq('tenant_id', event.tenant_id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (eventMenu?.id) {
            const { data: dishes } = await dbAdmin
              .from('dishes')
              .select('course_name, description')
              .eq('menu_id', eventMenu.id)
              .eq('tenant_id', event.tenant_id)
              .order('course_number', { ascending: true })
              .order('sort_order', { ascending: true })

            if (dishes && dishes.length > 0) {
              menuHighlights = dishes
                .map((d: any) => d.description || d.course_name)
                .filter(Boolean)
                .slice(0, 6) // Cap at 6 dishes - keep email concise
            }
          }
        } catch {
          // Menu fetch failing must never block the completion
        }

        // Circle-first: post completion to circle
        try {
          const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
          const clientFirst = client.full_name?.split(' ')[0] || ''
          let thankYou = 'Thank you for a wonderful evening!'
          if (clientFirst) thankYou = `Thank you for a wonderful evening, ${clientFirst}!`
          if (menuHighlights.length > 0) {
            thankYou += ` We served ${menuHighlights.slice(0, 3).join(', ')}${menuHighlights.length > 3 ? ', and more' : ''}. I hope everyone loved it.`
          } else {
            thankYou += " I hope everyone enjoyed the meal. I'll share photos here soon."
          }

          await circleFirstNotify({
            eventId,
            notificationType: 'event_completed',
            body: thankYou,
            metadata: { event_id: eventId },
            actionUrl: `/my-events/${eventId}`,
            actionLabel: 'Leave a Review',
            fallbackEmail: client.email
              ? {
                  to: client.email,
                  subject: `Thank you for a wonderful evening!`,
                  react: (await import('react')).createElement(
                    (await import('@/lib/email/templates/event-completed')).EventCompletedEmail,
                    {
                      clientName: client.full_name,
                      chefName,
                      occasion,
                      eventDate: dateToDateString(event.event_date as Date | string),
                      guestCount: event.guest_count,
                      menuHighlights,
                      receiptUrl: `/my-events/${eventId}`,
                      reviewUrl: `/my-events/${eventId}`,
                    } as any
                  ),
                }
              : undefined,
          })
        } catch (cfErr) {
          log.events.warn('Circle-first completed notify failed (non-blocking)', { error: cfErr })
          await sendEventCompletedEmail({
            clientEmail: client.email,
            clientName: client.full_name,
            chefName,
            eventId,
            occasion,
            eventDate: dateToDateString(event.event_date as Date | string),
          })
        }
      }

      if (toStatus === 'cancelled') {
        await sendEventCancelledEmail({
          recipientEmail: client.email,
          recipientName: client.full_name,
          occasion,
          eventDate: dateToDateString(event.event_date as Date | string),
          cancelledBy: actor?.role === 'chef' ? chefName : 'the client',
          reason: (metadata.reason as string) || null,
        })
      }

      // Also email the chef when a client cancels
      if (toStatus === 'cancelled' && actor?.role === 'client' && chef.email) {
        await sendEventCancelledEmail({
          recipientEmail: chef.email,
          recipientName: chef.business_name || 'Chef',
          occasion,
          eventDate: dateToDateString(event.event_date as Date | string),
          cancelledBy: client.full_name || 'the client',
          reason: (metadata.reason as string) || null,
        })
      }

      // Q19 fix: Notify RSVP'd guests on cancellation (non-blocking)
      // Guests who RSVP'd via share links need to know the event is cancelled
      // so they don't show up. Safety-critical notification.
      if (toStatus === 'cancelled') {
        try {
          const dbAdmin = createServerClient({ admin: true })
          const { data: rsvpGuests } = await dbAdmin
            .from('event_guests')
            .select('email, full_name')
            .eq('event_id', eventId)
            .in('rsvp_status', ['attending', 'maybe'])

          if (rsvpGuests && rsvpGuests.length > 0) {
            const cancelledBy = actor?.role === 'chef' ? chefName : client.full_name || 'the host'
            for (const guest of rsvpGuests) {
              if (!guest.email) continue
              try {
                await sendEventCancelledEmail({
                  recipientEmail: guest.email,
                  recipientName: guest.full_name || 'Guest',
                  occasion,
                  eventDate: dateToDateString(event.event_date as Date | string),
                  cancelledBy,
                  reason: (metadata.reason as string) || null,
                })
              } catch (guestEmailErr) {
                log.events.warn('Guest cancellation email failed (non-blocking)', {
                  context: { guestEmail: guest.email },
                  error: guestEmailErr,
                })
              }
            }
          }
        } catch (guestNotifyErr) {
          log.events.warn('Guest cancellation notification failed (non-blocking)', {
            error: guestNotifyErr,
          })
        }
      }
    }
  } catch (emailErr) {
    log.events.warn('Email send failed (non-blocking)', { error: emailErr })
  }

  // Circle posts: accepted + paid + in_progress (confirmed + completed handled by circleFirstNotify above)

  if (toStatus === 'accepted' && fromStatus === 'proposed') {
    try {
      const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
      await circleFirstNotify({
        eventId,
        inquiryId: event.inquiry_id ?? null,
        notificationType: 'quote_accepted',
        body: "You've accepted the proposal. I'm looking forward to cooking for you. I'll follow up with the next steps soon.",
        metadata: { event_id: eventId },
        actionUrl: `/my-events/${eventId}`,
        actionLabel: 'View Event',
      })
    } catch (circleErr) {
      log.events.warn('Circle post for accepted failed (non-blocking)', { error: circleErr })
    }
  }

  if (toStatus === 'paid') {
    try {
      const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
      await circleFirstNotify({
        eventId,
        inquiryId: event.inquiry_id ?? null,
        notificationType: 'payment_received',
        body: 'Payment confirmed. Your date is locked in. I will start planning and share the full details here soon.',
        metadata: { event_id: eventId },
        actionUrl: `/my-events/${eventId}`,
        actionLabel: 'View Event',
      })
    } catch (circleErr) {
      log.events.warn('Circle post for paid failed (non-blocking)', { error: circleErr })
    }
  }

  if (toStatus === 'in_progress' && fromStatus === 'confirmed') {
    try {
      const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
      const arrivalMsg = event.arrival_time
        ? `I'm on my way and will arrive around ${event.arrival_time}. See you soon!`
        : "I'm on my way. See you soon!"
      await circleFirstNotify({
        eventId,
        inquiryId: event.inquiry_id ?? null,
        notificationType: 'running_late',
        body: arrivalMsg,
        metadata: { event_id: eventId },
        actionUrl: `/my-events/${eventId}`,
        actionLabel: 'View Event',
      })
    } catch (circleErr) {
      log.events.warn('Circle post for in_progress failed (non-blocking)', { error: circleErr })
    }
  }

  // Create post-event survey and email client (non-blocking)
  if (toStatus === 'completed' && fromStatus === 'in_progress') {
    try {
      const { sendPostEventSurveyForEvent } = await import('@/lib/post-event/trust-loop-actions')
      await sendPostEventSurveyForEvent(eventId, event.tenant_id)
    } catch (surveyErr) {
      log.events.warn('Survey creation failed (non-blocking)', { error: surveyErr })
    }

    // Check food cost variance alerts (non-blocking)
    try {
      const { checkVarianceAlerts } = await import('@/lib/inventory/variance-alert-actions')
      await checkVarianceAlerts(eventId)
    } catch (varianceErr) {
      log.events.warn('Variance alert check failed (non-blocking)', { error: varianceErr })
    }

    // Auto-deduct inventory for ingredients used in this event (non-blocking)
    // Walks the full recipe chain: event -> menus -> dishes -> components -> recipes -> ingredients
    try {
      const { executeEventDeduction } = await import('@/lib/inventory/event-deduction-actions')
      await executeEventDeduction(eventId)
    } catch (deductErr) {
      log.events.warn('Inventory auto-deduction failed (non-blocking)', { error: deductErr })
    }

    await runCompletedEventPostProcessing(eventId, event.tenant_id)
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
  // Uses deterministic rule-based engine - not AI output. Skips if blocks exist.
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

  // Push notification to chef when proposal accepted (non-blocking)
  if (toStatus === 'accepted' && fromStatus === 'proposed') {
    try {
      const { getChefAuthUserId } = await import('@/lib/notifications/actions')
      const chefUserId = await getChefAuthUserId(event.tenant_id)
      if (chefUserId) {
        const { notifyProposalAccepted } = await import('@/lib/notifications/onesignal')
        await notifyProposalAccepted(chefUserId, event.occasion || 'Untitled event', eventId)
      }
    } catch (err) {
      log.events.warn('Push notification for accepted failed (non-blocking)', { error: err })
    }
  }

  // Push notification for confirmed / in_progress / completed events (non-blocking)
  if (toStatus === 'confirmed' || toStatus === 'in_progress' || toStatus === 'completed') {
    try {
      const { getChefAuthUserId } = await import('@/lib/notifications/actions')
      const chefUserId = await getChefAuthUserId(event.tenant_id)
      if (chefUserId) {
        const eventTitle = event.occasion || 'Untitled event'
        if (toStatus === 'confirmed') {
          const { notifyEventConfirmed } = await import('@/lib/notifications/onesignal')
          await notifyEventConfirmed(chefUserId, eventTitle, eventId)
        } else if (toStatus === 'in_progress') {
          const { notifyEventInProgress } = await import('@/lib/notifications/onesignal')
          await notifyEventInProgress(chefUserId, eventTitle, eventId)
        } else {
          const { notifyEventCompleted } = await import('@/lib/notifications/onesignal')
          await notifyEventCompleted(chefUserId, eventTitle, eventId)
        }
      }
    } catch (err) {
      log.events.warn('Push notification failed (non-blocking)', { error: err })
    }
  }

  // Enqueue Inngest post-event follow-up sequence (non-blocking)
  // Sends thank-you (3d), review request (7d), and referral ask (14d) emails.
  if (toStatus === 'completed' && fromStatus === 'in_progress') {
    try {
      const { inngest } = await import('@/lib/jobs/inngest-client')
      await inngest.send({
        name: 'chefflow/event.completed',
        data: {
          eventId,
          tenantId: event.tenant_id,
          clientId: event.client_id,
          occasion: event.occasion || 'your event',
          eventDate: dateToDateString(event.event_date as Date | string),
          completedAt: new Date().toISOString(),
        },
      })
    } catch (err) {
      log.events.warn('Inngest post-event enqueue failed (non-blocking)', { error: err })
    }
  }

  // Post-event AAR prompt: Remy alert asking chef to capture while fresh (non-blocking)
  if (toStatus === 'completed' && fromStatus === 'in_progress') {
    try {
      const { createAdminClient: createAdmin } = await import('@/lib/db/admin')
      const dbAdmin2 = createAdmin()
      const aarUrl = `/events/${eventId}/aar`
      await dbAdmin2.from('remy_alerts').insert({
        tenant_id: event.tenant_id,
        alert_type: 'post_event_aar_prompt',
        entity_type: 'event',
        entity_id: eventId,
        title: `How did ${event.occasion || 'tonight'} go?`,
        body: `Capture what worked, what to tweak, and any client notes while it's still fresh. Takes 2 minutes. [Open AAR](${aarUrl})`,
        priority: 'high',
      })
    } catch (err) {
      log.events.warn('Post-event AAR alert failed (non-blocking)', { error: err })
    }
  }

  // Archive Dinner Circle when event completes (non-blocking)
  // Guests can still read the history, but no new messages can be posted.
  if (toStatus === 'completed' && fromStatus === 'in_progress') {
    try {
      const adminSupa = createServerClient({ admin: true })
      // Find circle linked to this event
      const { data: linkedGroup } = await adminSupa
        .from('hub_groups')
        .select('id')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .maybeSingle()

      if (linkedGroup?.id) {
        await adminSupa
          .from('hub_groups')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', linkedGroup.id)
      }
    } catch (err) {
      log.events.warn('Circle archive on completion failed (non-blocking)', { error: err })
    }
  }

  // Zapier/Make webhook dispatch (non-blocking)
  try {
    const { dispatchWebhookEvent } = await import('@/lib/integrations/zapier/zapier-webhooks')
    await dispatchWebhookEvent(event.tenant_id, 'event.status_changed', {
      event_id: eventId,
      from_status: fromStatus,
      to_status: toStatus,
      occasion: event.occasion ?? null,
      client_id: event.client_id,
      event_date: event.event_date,
    })
  } catch (err) {
    log.events.warn('Zapier dispatch failed (non-blocking)', { error: err })
  }

  // Outbound webhook dispatch (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(event.tenant_id, 'event.transitioned', {
      event_id: eventId,
      from_status: fromStatus,
      to_status: toStatus,
      occasion: event.occasion ?? null,
      client_id: event.client_id,
      event_date: event.event_date,
    })
  } catch (err) {
    log.events.warn('Outbound webhook dispatch failed (non-blocking)', { error: err })
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

  return transitionEvent({
    eventId,
    toStatus: 'completed',
    metadata: { action: 'chef_completed', chefId: user.entityId },
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
      chefId: user.entityId,
    },
  })
}

/**
 * Chef accepts event on behalf of client (verbal/text confirmation).
 * Moves proposed -> accepted without requiring client portal login.
 */
export async function acceptOnBehalf(eventId: string) {
  const user = await requireChef()

  return transitionEvent({
    eventId,
    toStatus: 'accepted',
    metadata: { action: 'chef_accepted_on_behalf', chefId: user.entityId },
  })
}

/**
 * Chef marks event as paid after receiving offline payment (cash, Venmo, Zelle, check).
 * Creates a ledger entry for the payment amount so the financial view stays accurate.
 * If no amount is specified, uses the event's quoted_price_cents as the payment amount.
 */
export async function markEventPaid(
  eventId: string,
  paymentMethod: 'cash' | 'venmo' | 'zelle' | 'check' | 'paypal' | 'card' | 'other' = 'cash',
  amountCents?: number
) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event to get quoted price and client ID
  const { data: event } = await db
    .from('events')
    .select('quoted_price_cents, client_id, tenant_id, occasion')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const paymentAmountCents = amountCents ?? event.quoted_price_cents
  if (!paymentAmountCents || paymentAmountCents <= 0) {
    throw new Error('Cannot mark paid: no quoted price set and no amount provided')
  }

  // Write ledger entry FIRST (before status transition) so financial view is accurate.
  // Uses the internal append function (not the server action) since we already have auth.
  // Deterministic idempotency key: prevents double-click / concurrent tab duplicate entries.
  // Same event + method + amount = same reference = idempotent.
  const { appendLedgerEntryInternal } = await import('@/lib/ledger/append-internal')
  const result = await appendLedgerEntryInternal({
    tenant_id: user.tenantId!,
    client_id: event.client_id,
    event_id: eventId,
    entry_type: 'payment',
    amount_cents: paymentAmountCents,
    payment_method: paymentMethod === 'other' ? 'cash' : paymentMethod,
    description: `Offline payment for ${event.occasion || 'event'} (${paymentMethod})`,
    transaction_reference: `offline_${eventId}_${paymentMethod}_${paymentAmountCents}`,
    created_by: user.id,
  })

  if (result.duplicate) {
    log.events.info('Duplicate offline payment (idempotent)', {
      context: { eventId, paymentMethod },
    })
  }

  // Update payment method on the event.
  // payment_status is NOT set here: the DB trigger (update_event_payment_status_on_ledger_insert)
  // computes it from ledger entries. Direct writes would bypass the trigger and could diverge.
  await db
    .from('events')
    .update({
      payment_method_primary: paymentMethod === 'other' ? 'cash' : paymentMethod,
    })
    .eq('id', eventId)

  // Now transition status
  return transitionEvent({
    eventId,
    toStatus: 'paid',
    metadata: {
      action: 'chef_marked_paid_offline',
      chefId: user.entityId,
      payment_method: paymentMethod,
      amount_cents: paymentAmountCents,
    },
  })
}
