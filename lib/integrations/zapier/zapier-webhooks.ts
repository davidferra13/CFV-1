'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/require-chef'

// Zapier/Make webhook automation layer.
// Chefs subscribe to ChefFlow events → we POST to their Zapier/Make webhook URL.

export const ZAPIER_EVENT_TYPES = [
  'inquiry.created',
  'inquiry.updated',
  'event.created',
  'event.status_changed',
  'event.completed',
  'client.created',
  'client.updated',
  'payment.received',
  'payment.refunded',
  'invoice.created',
  'invoice.sent',
  'quote.sent',
  'quote.accepted',
  'contract.signed',
  'expense.created',
  'review.received',
  'task.completed',
] as const

export type ZapierEventType = (typeof ZAPIER_EVENT_TYPES)[number]

// ── Subscription management ──

export async function createWebhookSubscription(input: {
  targetUrl: string
  eventTypes: string[]
  label?: string
}) {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  // Validate URL
  try {
    const url = new URL(input.targetUrl)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Webhook URL must use HTTPS')
    }
  } catch {
    throw new Error('Invalid webhook URL')
  }

  // Validate event types
  const validTypes = input.eventTypes.filter((t) =>
    ZAPIER_EVENT_TYPES.includes(t as ZapierEventType)
  )
  if (validTypes.length === 0) {
    throw new Error('At least one valid event type is required')
  }

  const { data, error } = await supabase
    .from('zapier_webhook_subscriptions')
    .insert({
      tenant_id: user.entityId,
      target_url: input.targetUrl,
      event_types: validTypes,
    })
    .select('id, target_url, event_types, secret, created_at')
    .single()

  if (error) throw new Error(`Failed to create webhook subscription: ${error.message}`)

  return data
}

export async function listWebhookSubscriptions() {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('zapier_webhook_subscriptions')
    .select('id, target_url, event_types, is_active, created_at, updated_at')
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list subscriptions: ${error.message}`)

  return data || []
}

export async function deleteWebhookSubscription(subscriptionId: string) {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase
    .from('zapier_webhook_subscriptions')
    .update({ is_active: false })
    .eq('id', subscriptionId)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(`Failed to delete subscription: ${error.message}`)

  return { success: true }
}

export async function getRecentDeliveries(subscriptionId: string, limit = 20) {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('zapier_webhook_deliveries')
    .select('id, event_type, response_status, error, delivered_at, created_at')
    .eq('subscription_id', subscriptionId)
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch deliveries: ${error.message}`)

  return data || []
}

// ── Event dispatch (called internally by server actions) ──

export async function dispatchWebhookEvent(
  tenantId: string,
  eventType: ZapierEventType,
  payload: Record<string, unknown>
) {
  const supabase = createServerClient({ admin: true })

  // Find all active subscriptions for this tenant and event type
  const { data: subs } = await supabase
    .from('zapier_webhook_subscriptions')
    .select('id, target_url, secret')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .contains('event_types', [eventType])

  if (!subs || subs.length === 0) return

  const deliveryPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload,
  }

  // Fire-and-forget to all subscriptions in parallel
  const deliveries = subs.map(async (sub) => {
    const deliveryId = crypto.randomUUID()
    let responseStatus: number | null = null
    let responseBody: string | null = null
    let error: string | null = null

    try {
      // Create HMAC signature for verification
      const { createHmac } = await import('crypto')
      const bodyStr = JSON.stringify(deliveryPayload)
      const signature = createHmac('sha256', sub.secret).update(bodyStr).digest('hex')

      const response = await fetch(sub.target_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ChefFlow-Signature': signature,
          'X-ChefFlow-Event': eventType,
          'X-ChefFlow-Delivery': deliveryId,
        },
        body: bodyStr,
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      responseStatus = response.status
      responseBody = await response.text().catch(() => null)

      if (!response.ok) {
        error = `HTTP ${response.status}`
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Delivery failed'
    }

    // Log delivery
    try {
      await supabase.from('zapier_webhook_deliveries').insert({
        id: deliveryId,
        subscription_id: sub.id,
        tenant_id: tenantId,
        event_type: eventType,
        payload: deliveryPayload,
        response_status: responseStatus,
        response_body: responseBody?.slice(0, 1000) || null,
        delivered_at: responseStatus ? new Date().toISOString() : null,
        error,
      })
    } catch (logErr) {
      console.error('[zapier] Failed to log delivery:', logErr)
    }
  })

  // Don't await — fire and forget (non-blocking side effect)
  Promise.allSettled(deliveries).catch(() => {})
}

// ── Test webhook ──

export async function testWebhookSubscription(subscriptionId: string) {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { data: sub } = await supabase
    .from('zapier_webhook_subscriptions')
    .select('id, target_url, secret')
    .eq('id', subscriptionId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!sub) throw new Error('Subscription not found')

  const testPayload = {
    event: 'test.ping' as const,
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook from ChefFlow',
      subscription_id: subscriptionId,
    },
  }

  const { createHmac } = await import('crypto')
  const bodyStr = JSON.stringify(testPayload)
  const signature = createHmac('sha256', sub.secret).update(bodyStr).digest('hex')

  const response = await fetch(sub.target_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ChefFlow-Signature': signature,
      'X-ChefFlow-Event': 'test.ping',
      'X-ChefFlow-Delivery': crypto.randomUUID(),
    },
    body: bodyStr,
    signal: AbortSignal.timeout(10000),
  })

  return {
    success: response.ok,
    status: response.status,
    body: await response.text().catch(() => ''),
  }
}
