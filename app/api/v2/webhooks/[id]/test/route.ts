// API v2: Webhook Test - Send test ping
// POST /api/v2/webhooks/:id/test

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'
import { createHmac } from 'crypto'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Webhook subscription')

    // Fetch endpoint and verify ownership
    const { data: endpoint, error: fetchError } = await ctx.db
      .from('webhook_endpoints' as any)
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (fetchError || !endpoint) return apiNotFound('Webhook subscription')

    const body = JSON.stringify({
      event: 'test.ping',
      data: {
        message: 'This is a test webhook from ChefFlow.',
        endpoint_id: id,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    })

    const signature = createHmac('sha256', (endpoint as any).secret)
      .update(body)
      .digest('hex')

    const startMs = Date.now()
    let responseStatus: number | null = null
    let success = false
    let errorMessage: string | undefined

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)

      const response = await fetch((endpoint as any).url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ChefFlow-Signature': `sha256=${signature}`,
          'X-ChefFlow-Event': 'test.ping',
        },
        body,
        signal: controller.signal,
        redirect: 'error',
      })

      clearTimeout(timeout)
      responseStatus = response.status
      success = response.ok

      if (!response.ok) {
        errorMessage = `HTTP ${response.status}`
      }
    } catch (err) {
      errorMessage = String(err)
    }

    const durationMs = Date.now() - startMs

    // Log the test delivery (non-blocking)
    try {
      await ctx.db.from('webhook_deliveries' as any).insert({
        endpoint_id: id,
        tenant_id: ctx.tenantId,
        event_type: 'test.ping',
        payload: { test: true },
        response_status: responseStatus,
        duration_ms: durationMs,
        success,
        status: success ? 'delivered' : 'failed',
        delivered_at: success ? new Date().toISOString() : null,
      } as any)
    } catch {
      // Non-blocking: delivery log failure should not affect result
    }

    return apiSuccess({
      success,
      status: responseStatus,
      duration_ms: durationMs,
      ...(errorMessage ? { error: errorMessage } : {}),
    })
  },
  { scopes: ['webhooks:manage'] }
)
