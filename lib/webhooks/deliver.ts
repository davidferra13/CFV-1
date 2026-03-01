import { createServerClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'
import { withRetry, pushToDLQ, isTransientError } from '@/lib/resilience/retry'

export async function deliverWebhook(
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const { data: endpointsRaw } = await supabase
    .from('webhook_endpoints' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .contains('events', [eventType])

  const endpoints = endpointsRaw as unknown as Array<{ id: string; url: string; secret: string }>
  if (!endpoints || endpoints.length === 0) return

  const body = JSON.stringify({
    event: eventType,
    data: payload,
    timestamp: new Date().toISOString(),
  })

  for (const endpoint of endpoints) {
    const signature = createHmac('sha256', endpoint.secret).update(body).digest('hex')

    let responseStatus: number | null = null
    let deliveryStatus = 'failed'
    let deliveryError: string | null = null
    const MAX_ATTEMPTS = 3

    try {
      const response = await withRetry(
        () =>
          fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-ChefFlow-Signature': `sha256=${signature}`,
              'X-ChefFlow-Event': eventType,
            },
            body,
            signal: AbortSignal.timeout(10000),
            redirect: 'error',
          }),
        {
          maxAttempts: MAX_ATTEMPTS,
          baseDelayMs: 1000,
          maxDelayMs: 15_000,
          retryOn: isTransientError,
          onRetry: (attempt, err) =>
            console.warn(`[deliverWebhook] Retry ${attempt} for ${endpoint.url}:`, err),
        }
      )

      responseStatus = response.status
      deliveryStatus = response.ok ? 'delivered' : 'failed'

      if (!response.ok) {
        // Non-2xx after retries exhausted — push to DLQ for manual review
        await pushToDLQ(supabase as any, {
          tenantId,
          jobType: 'webhook_delivery',
          jobId: endpoint.id,
          payload: { endpoint_url: endpoint.url, event_type: eventType, payload },
          errorMessage: `HTTP ${response.status} from ${endpoint.url}`,
          attempts: MAX_ATTEMPTS,
        })
      }
    } catch (err) {
      deliveryError = String(err)
      await pushToDLQ(supabase as any, {
        tenantId,
        jobType: 'webhook_delivery',
        jobId: endpoint.id,
        payload: { endpoint_url: endpoint.url, event_type: eventType, payload },
        errorMessage: deliveryError,
        attempts: MAX_ATTEMPTS,
      })
    }

    await supabase.from('webhook_deliveries' as any).insert({
      endpoint_id: endpoint.id,
      tenant_id: tenantId,
      event_type: eventType,
      payload,
      response_status: responseStatus,
      status: deliveryStatus,
      delivered_at: deliveryStatus === 'delivered' ? new Date().toISOString() : null,
      ...(deliveryError && { response_body: deliveryError }),
    })
  }
}
