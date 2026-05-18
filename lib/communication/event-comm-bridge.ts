// Event -> Communication Bridge
// Wires event lifecycle transitions into the communication pipeline so
// notifications fire instantly instead of waiting for the 60min CIL scan.
// Called as a non-blocking side effect from transitionEvent.

import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'

// -- 1h Dedup (prevents double-fire on concurrent requests) --
const DEDUP_TTL_MS = 60 * 60 * 1000
const bridgeDedup = new Map<string, number>()

function shouldFire(key: string): boolean {
  const now = Date.now()
  for (const [k, ts] of bridgeDedup) {
    if (now - ts > DEDUP_TTL_MS) bridgeDedup.delete(k)
  }
  const last = bridgeDedup.get(key)
  return !last || now - last > DEDUP_TTL_MS
}

function markFired(key: string): void {
  bridgeDedup.set(key, Date.now())
}

// -- Transition to communication action mapping --

type TransitionComm = {
  action: string
  description: string
  notifyChef: boolean
  notifyTitle: string
  notifyBody: (occasion: string) => string
}

const TRANSITION_COMM: Record<string, TransitionComm | null> = {
  proposed: {
    action: 'event_proposal_sent',
    description: 'Proposal sent to client; awaiting acceptance',
    notifyChef: false,
    notifyTitle: 'Proposal sent',
    notifyBody: (o) => 'Proposal for "' + o + '" sent to client.',
  },
  accepted: {
    action: 'event_proposal_accepted',
    description: 'Client accepted proposal; payment pending',
    notifyChef: true,
    notifyTitle: 'Proposal accepted',
    notifyBody: (o) => 'Client accepted your proposal for "' + o + '". Collect payment to confirm.',
  },
  paid: {
    action: 'event_payment_received',
    description: 'Payment received; event awaiting confirmation',
    notifyChef: true,
    notifyTitle: 'Payment received',
    notifyBody: (o) => 'Payment received for "' + o + '". Confirm the event to begin prep.',
  },
  confirmed: {
    action: 'event_confirmed',
    description: 'Event confirmed; prep and logistics can begin',
    notifyChef: false,
    notifyTitle: 'Event confirmed',
    notifyBody: (o) => '"' + o + '" is confirmed. Prep, travel, and grocery tasks are ready.',
  },
  in_progress: {
    action: 'event_started',
    description: 'Event service started; client notified',
    notifyChef: false,
    notifyTitle: 'Event in progress',
    notifyBody: (o) => '"' + o + '" is now in progress.',
  },
  completed: {
    action: 'event_completed',
    description: 'Event completed; post-event follow-up triggered',
    notifyChef: true,
    notifyTitle: 'Event completed',
    notifyBody: (o) => '"' + o + '" is complete. Post-event follow-up sequence started.',
  },
  cancelled: {
    action: 'event_cancelled',
    description: 'Event cancelled; closing communication',
    notifyChef: true,
    notifyTitle: 'Event cancelled',
    notifyBody: (o) => '"' + o + '" has been cancelled. Review refund and client communication.',
  },
}

// -- Public API --

/**
 * Called after a successful event transition.
 * Logs the transition to the communication action log and creates
 * instant notifications (replacing the 60min CIL scan delay).
 */
export async function onEventTransitioned(params: {
  tenantId: string
  eventId: string
  clientId: string | null
  fromStatus: string
  toStatus: string
  occasion: string | null
  inquiryId: string | null
}) {
  const dedupKey =
    'evt-transition:' +
    params.tenantId +
    ':' +
    params.eventId +
    ':' +
    params.fromStatus +
    ':' +
    params.toStatus
  if (!shouldFire(dedupKey)) return

  const comm = TRANSITION_COMM[params.toStatus]
  if (!comm) return

  try {
    const { logCommunicationAction } = await import('@/lib/communication/pipeline')

    await logCommunicationAction({
      tenantId: params.tenantId,
      action: comm.action,
      source: 'automation',
      previousState: { status: params.fromStatus },
      newState: {
        status: params.toStatus,
        event_id: params.eventId,
        client_id: params.clientId,
        inquiry_id: params.inquiryId,
        outreach_description: comm.description,
      },
    })

    // Instant chef notification for transitions that need attention
    if (comm.notifyChef) {
      const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
      const chefUserId = await getChefAuthUserId(params.tenantId)
      if (chefUserId) {
        const occasion = params.occasion || 'Untitled event'
        await createNotification({
          tenantId: params.tenantId,
          recipientId: chefUserId,
          category: params.toStatus === 'paid' ? 'payment' : 'event',
          action: 'system_alert',
          title: comm.notifyTitle,
          body: comm.notifyBody(occasion),
          actionUrl: '/events/' + params.eventId,
          eventId: params.eventId,
          clientId: params.clientId || undefined,
          metadata: {
            origin: 'event_comm_bridge',
            from_status: params.fromStatus,
            to_status: params.toStatus,
          },
        })
      }
    }

    markFired(dedupKey)
  } catch (err) {
    recordSideEffectFailure({
      source: 'event-comm-bridge',
      operation: 'onEventTransitioned',
      severity: 'low',
      entityType: 'event',
      entityId: params.eventId,
      tenantId: params.tenantId,
      errorMessage: err instanceof Error ? err.message : String(err),
    })
  }
}
