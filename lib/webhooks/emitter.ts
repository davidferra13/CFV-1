// Outbound Webhook Emitter
// Fire-and-forget entry point for dispatching webhooks to chef-configured endpoints.
// This function NEVER throws. It is always safe to call as a non-blocking side effect.
//
// Uses the existing deliverWebhook() infrastructure for actual HTTP delivery,
// then updates failure_count / last_triggered_at / auto-disable on the endpoint row.

import { createServerClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'
import type { WebhookEventType } from './types'

/**
 * Emit a webhook event to all matching active endpoints for a chef.
 *
 * Safe to call from any server action as a non-blocking side effect.
 * Wrapping in try/catch at the call site is still recommended but not required;
 * this function catches all internal errors.
 */
export async function emitWebhook(
  chefId: string,
  eventType: WebhookEventType,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServerClient({ admin: true })

    // Find all active subscriptions that listen for this event type
    const { data: endpointsRaw } = await supabase
      .from('webhook_endpoints' as any)
      .select('*')
      .eq('tenant_id', chefId)
      .eq('is_active', true)
      .contains('events', [eventType])

    const endpoints = endpointsRaw as unknown as Array<{
      id: string
      url: string
      secret: string
      failure_count: number
    }>

    if (!endpoints || endpoints.length === 0) return

    const body = JSON.stringify({
      event: eventType,
      data: payload,
      timestamp: new Date().toISOString(),
    })

    for (const endpoint of endpoints) {
      const startMs = Date.now()
      const signature = createHmac('sha256', endpoint.secret).update(body).digest('hex')

      let responseStatus: number | null = null
      let responseBody: string | null = null
      let success = false

      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10_000)

        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ChefFlow-Signature': `sha256=${signature}`,
            'X-ChefFlow-Event': eventType,
          },
          body,
          signal: controller.signal,
          redirect: 'error',
        })

        clearTimeout(timeout)
        responseStatus = response.status
        success = response.ok

        if (!response.ok) {
          try {
            responseBody = (await response.text()).slice(0, 2000)
          } catch {
            // ignore body read failure
          }
        }
      } catch (fetchErr) {
        responseBody = String(fetchErr).slice(0, 2000)
      }

      const durationMs = Date.now() - startMs

      // Log delivery attempt
      try {
        await supabase.from('webhook_deliveries' as any).insert({
          endpoint_id: endpoint.id,
          tenant_id: chefId,
          event_type: eventType,
          payload,
          response_status: responseStatus,
          response_body: responseBody,
          duration_ms: durationMs,
          success,
          status: success ? 'delivered' : 'failed',
          delivered_at: success ? new Date().toISOString() : null,
        })
      } catch (logErr) {
        console.error('[emitWebhook] Failed to log delivery:', logErr)
      }

      // Update endpoint tracking
      try {
        if (success) {
          // Reset failure count on success
          await supabase
            .from('webhook_endpoints' as any)
            .update({
              failure_count: 0,
              last_triggered_at: new Date().toISOString(),
            })
            .eq('id', endpoint.id)
        } else {
          const newFailureCount = (endpoint.failure_count || 0) + 1
          const updatePayload: Record<string, unknown> = {
            failure_count: newFailureCount,
            last_triggered_at: new Date().toISOString(),
          }
          // Auto-disable after 10 consecutive failures
          if (newFailureCount >= 10) {
            updatePayload.is_active = false
          }
          await supabase
            .from('webhook_endpoints' as any)
            .update(updatePayload)
            .eq('id', endpoint.id)
        }
      } catch (updateErr) {
        console.error('[emitWebhook] Failed to update endpoint tracking:', updateErr)
      }
    }
  } catch (err) {
    // Top-level catch: emitWebhook must never throw
    console.error('[emitWebhook] Unexpected error (non-blocking):', err)
  }
}
