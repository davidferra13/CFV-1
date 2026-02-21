import { createServerClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

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

  const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() })

  for (const endpoint of endpoints) {
    const signature = createHmac('sha256', endpoint.secret).update(body).digest('hex')

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ChefFlow-Signature': `sha256=${signature}`,
          'X-ChefFlow-Event': eventType,
        },
        body,
        signal: AbortSignal.timeout(10000),
      })

      await supabase.from('webhook_deliveries' as any).insert({
        endpoint_id: endpoint.id,
        tenant_id: tenantId,
        event_type: eventType,
        payload,
        response_status: response.status,
        status: response.ok ? 'delivered' : 'failed',
        delivered_at: response.ok ? new Date().toISOString() : null,
      })
    } catch (err) {
      await supabase.from('webhook_deliveries' as any).insert({
        endpoint_id: endpoint.id,
        tenant_id: tenantId,
        event_type: eventType,
        payload,
        status: 'failed',
        response_body: String(err),
      })
    }
  }
}
