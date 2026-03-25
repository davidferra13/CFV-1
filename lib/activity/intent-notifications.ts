// Intent Notifications - fires chef notifications when clients take high-value actions.
// Called as a fire-and-forget side effect from /api/activity/track.
// Never throws; all errors are caught and logged.

import { createServerClient } from '@/lib/db/server'
import { createNotification } from '@/lib/notifications/actions'
import type { ActivityEventType } from './types'

interface IntentNotificationInput {
  tenantId: string
  clientId: string
  eventType: ActivityEventType
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Look up the chef's auth_user_id for a given tenant.
 * Uses the user_roles table (entity_id = tenant_id for chef role).
 */
async function getChefRecipientId(tenantId: string): Promise<string | null> {
  const db = createServerClient({ admin: true })
  const { data } = await db
    .from('user_roles')
    .select('auth_user_id')
    .eq('entity_id', tenantId)
    .eq('role', 'chef')
    .maybeSingle()
  return data?.auth_user_id ?? null
}

/**
 * Check if a notification of a given action+client combination was already
 * fired within the deduplication window. Returns true if we should skip.
 */
async function isDuplicate(
  tenantId: string,
  action: string,
  clientId: string,
  windowMs: number
): Promise<boolean> {
  const db = createServerClient({ admin: true })
  const since = new Date(Date.now() - windowMs).toISOString()
  const { data } = await db
    .from('notifications')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('action', action)
    .eq('client_id', clientId)
    .gte('created_at', since)
    .limit(1)
  return (data?.length ?? 0) > 0
}

/**
 * Main entry point. Called after a successful activity_events INSERT.
 * Fires intent-based notifications to the chef. Never throws.
 */
export async function checkAndFireIntentNotifications(
  input: IntentNotificationInput
): Promise<void> {
  try {
    const { tenantId, clientId, eventType, entityId, metadata } = input

    // Only care about a subset of high-intent events
    const INTENT_EVENTS: ActivityEventType[] = [
      'payment_page_visited',
      'proposal_viewed',
      'quote_viewed',
    ]
    if (!INTENT_EVENTS.includes(eventType)) return

    const db = createServerClient({ admin: true })

    // Get chef recipient ID
    const recipientId = await getChefRecipientId(tenantId)
    if (!recipientId) return

    // Get client name for notification body
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', clientId)
      .single()
    const clientName = client?.full_name || 'A client'

    if (eventType === 'payment_page_visited') {
      // Dedup: once per 30 minutes per client
      const skip = await isDuplicate(tenantId, 'client_on_payment_page', clientId, 30 * 60 * 1000)
      if (skip) return

      const occasion = typeof metadata?.occasion === 'string' ? metadata.occasion : undefined
      await createNotification({
        tenantId,
        recipientId,
        category: 'payment',
        action: 'client_on_payment_page',
        title: `${clientName} is on the payment page`,
        body: occasion
          ? `They may be about to pay for ${occasion}. Now is a great time to reach out.`
          : 'They may be about to pay. Now is a great time to send a quick message.',
        actionUrl: entityId ? `/events/${entityId}` : '/events',
        clientId,
        eventId: entityId ?? undefined,
        metadata: metadata ?? {},
      })
      return
    }

    if (eventType === 'proposal_viewed') {
      if (!entityId) return
      // Dedup: once per hour per event
      const skip = await isDuplicate(tenantId, 'client_viewed_proposal', clientId, 60 * 60 * 1000)
      if (skip) return

      const occasion = typeof metadata?.occasion === 'string' ? metadata.occasion : undefined
      await createNotification({
        tenantId,
        recipientId,
        category: 'event',
        action: 'client_viewed_proposal',
        title: `${clientName} opened your proposal`,
        body: occasion
          ? `They are reviewing the proposal for ${occasion}.`
          : 'They are reviewing your proposal - consider sending a follow-up message.',
        actionUrl: `/events/${entityId}`,
        clientId,
        eventId: entityId,
        metadata: metadata ?? {},
      })
      return
    }

    if (eventType === 'quote_viewed') {
      if (!entityId) return

      // Look up the quote to check how long ago it was sent
      const { data: quote } = await db
        .from('quotes')
        .select('sent_at, quote_name')
        .eq('id', entityId)
        .maybeSingle()

      if (!quote?.sent_at) return

      const hoursSinceSent = (Date.now() - new Date(quote.sent_at).getTime()) / (1000 * 60 * 60)
      const isDelayed = hoursSinceSent > 24
      const action = isDelayed ? 'quote_viewed_after_delay' : 'client_viewed_quote'

      // Dedup: once per 2 hours per quote
      const skip = await isDuplicate(tenantId, action, clientId, 2 * 60 * 60 * 1000)
      if (skip) return

      const title = isDelayed
        ? `${clientName} just opened your quote (${Math.round(hoursSinceSent)}h after sending)`
        : `${clientName} is reviewing your quote`

      await createNotification({
        tenantId,
        recipientId,
        category: 'quote',
        action,
        title,
        body: quote.quote_name || undefined,
        actionUrl: `/inquiries`,
        clientId,
        metadata: {
          quote_id: entityId,
          hours_since_sent: Math.round(hoursSinceSent),
          ...(metadata ?? {}),
        },
      })
      return
    }
  } catch (err) {
    // Non-fatal: never let notification failures bubble up to the tracking endpoint
    console.error('[checkAndFireIntentNotifications] failed (non-fatal):', err)
  }
}
