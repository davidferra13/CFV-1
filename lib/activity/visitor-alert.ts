// Visitor Alert - Real-time notification when a client visits the portal
// Debounced to one alert per client per 30-minute window.
// Non-blocking - failures are logged, never thrown.

import { createServerClient } from '@/lib/db/server'
import { sendNotification } from '@/lib/notifications/send'
import type { ActivityEventType } from './types'

const DEBOUNCE_MINUTES = 30

// Only alert on these high-signal events (not heartbeats or generic page views)
const ALERTABLE_EVENTS: ActivityEventType[] = [
  'portal_login',
  'payment_page_visited',
  'proposal_viewed',
  'quote_viewed',
]

const EVENT_LABELS: Record<string, string> = {
  portal_login: 'logged into the portal',
  payment_page_visited: 'is viewing the payment page',
  proposal_viewed: 'is reviewing a proposal',
  quote_viewed: 'is looking at a quote',
}

/**
 * Trigger a visitor alert notification for the chef.
 * Debounces: only one alert per client per 30-minute window.
 * Non-blocking: catches all errors internally.
 */
export async function triggerVisitorAlert(params: {
  tenantId: string
  clientId: string
  clientName: string
  eventType: ActivityEventType
}): Promise<void> {
  try {
    // Only alert on meaningful events
    if (!ALERTABLE_EVENTS.includes(params.eventType)) return

    const db = createServerClient({ admin: true })

    // Check debounce: was an alert sent for this client in the last 30 minutes?
    const cutoff = new Date(Date.now() - DEBOUNCE_MINUTES * 60 * 1000).toISOString()

    const { data: recentAlert } = await db
      .from('notifications')
      .select('id')
      .eq('tenant_id', params.tenantId)
      .eq('action', 'client_portal_visit')
      .eq('client_id', params.clientId)
      .gte('created_at', cutoff)
      .limit(1)
      .maybeSingle()

    if (recentAlert) return // Already alerted recently - skip

    // Check if visitor alerts are enabled for this chef
    const { data: prefs } = await db
      .from('chef_preferences')
      .select('visitor_alerts_enabled')
      .eq('chef_id', params.tenantId)
      .maybeSingle()

    // Default to enabled if no preference row exists
    if (prefs && prefs.visitor_alerts_enabled === false) return

    // Resolve the chef's auth_user_id (needed for sendNotification)
    const { data: chef } = await db
      .from('chefs')
      .select('auth_user_id')
      .eq('id', params.tenantId)
      .single()

    if (!chef?.auth_user_id) return

    // Resolve client name if not provided
    let clientName = params.clientName
    if (!clientName || clientName === 'A client') {
      const { data: client } = await db
        .from('clients')
        .select('full_name')
        .eq('id', params.clientId)
        .single()
      clientName = client?.full_name || 'A client'
    }

    const label = EVENT_LABELS[params.eventType] || 'is active on your site'
    const isHighIntent = ['payment_page_visited', 'proposal_viewed', 'quote_viewed'].includes(
      params.eventType
    )

    await sendNotification({
      tenantId: params.tenantId,
      recipientId: chef.auth_user_id,
      type: 'client_portal_visit',
      title: `${clientName} ${isHighIntent ? '🔥 ' : ''}${label}`,
      message: isHighIntent
        ? `High-intent signal: ${clientName} ${label}. Consider reaching out now.`
        : `${clientName} ${label}.`,
      link: `/clients/${params.clientId}`,
      clientId: params.clientId,
      metadata: {
        eventType: params.eventType,
        isHighIntent,
      },
    })
  } catch (err) {
    // Non-blocking: log and swallow
    console.error('[visitor-alert] Failed (non-fatal):', err)
  }
}
