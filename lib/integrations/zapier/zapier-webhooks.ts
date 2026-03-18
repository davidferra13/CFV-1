'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { ZAPIER_EVENT_TYPES, type ZapierEventType } from '@/lib/integrations/zapier/zapier-events'
import { validateWebhookUrl } from '@/lib/security/url-validation'

// Zapier/Make webhook automation layer.
// Chefs subscribe to ChefFlow events and we POST to their webhook URLs.

// Subscription management

export async function createWebhookSubscription(input: {
  targetUrl: string
  eventTypes: string[]
  label?: string
}) {
  await requirePro('integrations')
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  // SECURITY: Validate URL to prevent SSRF - blocks private IPs, requires HTTPS
  const targetUrl = validateWebhookUrl(input.targetUrl).toString()

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
      target_url: targetUrl,
      event_types: validTypes,
    })
    .select('id, target_url, event_types, secret, created_at')
    .single()

  if (error) throw new Error(`Failed to create webhook subscription: ${error.message}`)

  return data
}

export async function listWebhookSubscriptions() {
  await requirePro('integrations')
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('zapier_webhook_subscriptions')
    .select('id, target_url, event_types, is_active, created_at, updated_at')
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list subscriptions: ${error.message}`)

  return data || []
}

export async function deleteWebhookSubscription(subscriptionId: string) {
  await requirePro('integrations')
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { error } = await supabase
    .from('zapier_webhook_subscriptions')
    .update({ is_active: false })
    .eq('id', subscriptionId)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(`Failed to delete subscription: ${error.message}`)

  return { success: true }
}

export async function getRecentDeliveries(subscriptionId: string, limit = 20) {
  await requirePro('integrations')
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

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

// Event dispatch (called internally by server actions)

export async function dispatchWebhookEvent(
  tenantId: string,
  eventType: ZapierEventType,
  payload: Record<string, unknown>
) {
  const supabase: any = createServerClient({ admin: true })

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
  const deliveries = subs.map(async (sub: any) => {
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
        redirect: 'error',
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

  // Do not await. Fire and forget (non-blocking side effect)
  Promise.allSettled(deliveries).catch((err) => {
    console.error('[non-blocking] zapier webhook dispatch failed:', err)
  })
}

// Test webhook

export async function testWebhookSubscription(subscriptionId: string) {
  await requirePro('integrations')
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

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
    redirect: 'error',
  })

  return {
    success: response.ok,
    status: response.status,
    body: await response.text().catch(() => ''),
  }
}
