// Inquiry -> Communication Bridge
// Wires inquiry state changes into the communication pipeline so outreach
// is logged and follow-up timers are managed automatically.
// Called as a non-blocking side effect from inquiry server actions.

import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'

// -- 1h Dedup (prevents double-fire on rapid UI clicks) --
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

// -- Outreach descriptions per transition --

const TRANSITION_OUTREACH: Record<string, { action: string; description: string } | null> = {
  new: { action: 'inquiry_received', description: 'New lead received; initial outreach needed' },
  awaiting_client: {
    action: 'inquiry_chef_responded',
    description: 'Chef responded; waiting for client',
  },
  awaiting_chef: {
    action: 'inquiry_client_responded',
    description: 'Client responded; chef action needed',
  },
  quoted: {
    action: 'inquiry_quote_sent',
    description: 'Quote sent to client; follow-up scheduled',
  },
  confirmed: { action: 'inquiry_confirmed', description: 'Inquiry confirmed; conversion complete' },
  declined: { action: 'inquiry_declined', description: 'Inquiry declined; closing outreach' },
  expired: { action: 'inquiry_expired', description: 'Inquiry expired; re-engagement opportunity' },
}

// -- Public API --

/**
 * Called after a new inquiry is created.
 * Logs the inbound signal to the communication pipeline and notifies the chef.
 */
export async function onInquiryCreated(params: {
  tenantId: string
  inquiryId: string
  clientId: string | null
  clientName: string
  channel: string
  occasion: string | null
  sourceMessage: string | null
}) {
  const dedupKey = `inq-created:${params.tenantId}:${params.inquiryId}`
  if (!shouldFire(dedupKey)) return

  try {
    const { logCommunicationAction } = await import('@/lib/communication/pipeline')

    await logCommunicationAction({
      tenantId: params.tenantId,
      action: 'inquiry_created_comm_bridge',
      source: 'automation',
      previousState: {},
      newState: {
        inquiry_id: params.inquiryId,
        client_id: params.clientId,
        client_name: params.clientName,
        channel: params.channel,
        occasion: params.occasion,
        outreach_type: 'new_lead',
      },
    })

    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(params.tenantId)
    if (chefUserId) {
      await createNotification({
        tenantId: params.tenantId,
        recipientId: chefUserId,
        category: 'inquiry',
        action: 'new_inquiry',
        title: `New lead: ${params.clientName}`,
        body: params.occasion
          ? `${params.clientName} inquired about "${params.occasion}" via ${params.channel}. Respond promptly.`
          : `${params.clientName} reached out via ${params.channel}. Respond promptly.`,
        actionUrl: `/inquiries/${params.inquiryId}`,
        inquiryId: params.inquiryId,
        clientId: params.clientId || undefined,
        metadata: { origin: 'inquiry_comm_bridge', outreach_type: 'new_lead' },
      })
    }

    markFired(dedupKey)
  } catch (err) {
    recordSideEffectFailure({
      source: 'inquiry-comm-bridge',
      operation: 'onInquiryCreated',
      severity: 'low',
      entityType: 'inquiry',
      entityId: params.inquiryId,
      tenantId: params.tenantId,
      errorMessage: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Called after an inquiry transitions to a new status.
 * Logs the outreach action and creates proactive follow-up notifications.
 */
export async function onInquiryTransitioned(params: {
  tenantId: string
  inquiryId: string
  clientId: string | null
  fromStatus: string
  toStatus: string
}) {
  const dedupKey = `inq-transition:${params.tenantId}:${params.inquiryId}:${params.fromStatus}:${params.toStatus}`
  if (!shouldFire(dedupKey)) return

  const outreach = TRANSITION_OUTREACH[params.toStatus]
  if (!outreach) return

  try {
    const { logCommunicationAction } = await import('@/lib/communication/pipeline')

    await logCommunicationAction({
      tenantId: params.tenantId,
      action: outreach.action,
      source: 'automation',
      previousState: { status: params.fromStatus },
      newState: {
        status: params.toStatus,
        inquiry_id: params.inquiryId,
        client_id: params.clientId,
        outreach_description: outreach.description,
      },
    })

    if (params.toStatus === 'awaiting_chef') {
      const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
      const chefUserId = await getChefAuthUserId(params.tenantId)
      if (chefUserId) {
        await createNotification({
          tenantId: params.tenantId,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'system_alert',
          title: 'Client responded to inquiry',
          body: 'A client has responded and is waiting for your reply.',
          actionUrl: `/inquiries/${params.inquiryId}`,
          inquiryId: params.inquiryId,
          clientId: params.clientId || undefined,
          metadata: { origin: 'inquiry_comm_bridge', outreach_type: 'awaiting_chef' },
        })
      }
    }

    if (params.toStatus === 'quoted') {
      const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
      const chefUserId = await getChefAuthUserId(params.tenantId)
      if (chefUserId) {
        await createNotification({
          tenantId: params.tenantId,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'system_alert',
          title: 'Quote sent',
          body: 'Quote delivered to client. Follow up if no response in 72 hours.',
          actionUrl: `/inquiries/${params.inquiryId}`,
          inquiryId: params.inquiryId,
          clientId: params.clientId || undefined,
          metadata: { origin: 'inquiry_comm_bridge', outreach_type: 'quote_sent' },
        })
      }
    }

    if (params.toStatus === 'expired') {
      const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
      const chefUserId = await getChefAuthUserId(params.tenantId)
      if (chefUserId) {
        await createNotification({
          tenantId: params.tenantId,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'system_alert',
          title: 'Inquiry expired',
          body: 'An inquiry expired without conversion. Consider a re-engagement message.',
          actionUrl: `/inquiries/${params.inquiryId}`,
          inquiryId: params.inquiryId,
          clientId: params.clientId || undefined,
          metadata: { origin: 'inquiry_comm_bridge', outreach_type: 'expired_reengagement' },
        })
      }
    }

    markFired(dedupKey)
  } catch (err) {
    recordSideEffectFailure({
      source: 'inquiry-comm-bridge',
      operation: 'onInquiryTransitioned',
      severity: 'low',
      entityType: 'inquiry',
      entityId: params.inquiryId,
      tenantId: params.tenantId,
      errorMessage: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Called after an inquiry is declined.
 * Logs the decline as a communication closing action.
 */
export async function onInquiryDeclined(params: {
  tenantId: string
  inquiryId: string
  clientId: string | null
  reason: string | null
}) {
  const dedupKey = `inq-declined:${params.tenantId}:${params.inquiryId}`
  if (!shouldFire(dedupKey)) return

  try {
    const { logCommunicationAction } = await import('@/lib/communication/pipeline')

    await logCommunicationAction({
      tenantId: params.tenantId,
      action: 'inquiry_declined_comm_bridge',
      source: 'automation',
      previousState: {},
      newState: {
        inquiry_id: params.inquiryId,
        client_id: params.clientId,
        decline_reason: params.reason,
        outreach_type: 'closing',
      },
    })

    markFired(dedupKey)
  } catch (err) {
    recordSideEffectFailure({
      source: 'inquiry-comm-bridge',
      operation: 'onInquiryDeclined',
      severity: 'low',
      entityType: 'inquiry',
      entityId: params.inquiryId,
      tenantId: params.tenantId,
      errorMessage: err instanceof Error ? err.message : String(err),
    })
  }
}
