// API v2: Webhook Subscriptions - List & Create
// GET  /api/v2/webhooks
// POST /api/v2/webhooks

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'
import { randomBytes } from 'crypto'
import { validateWebhookUrl } from '@/lib/security/url-validation'

const CreateWebhookBody = z.object({
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const { data, error } = await ctx.db
      .from('webhook_endpoints' as any)
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })

    if (error) return apiError('database_error', 'Failed to fetch webhook subscriptions', 500)

    return apiSuccess(data ?? [])
  },
  { scopes: ['webhooks:manage'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateWebhookBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Validate URL to prevent SSRF
    let validatedUrl: string
    try {
      validatedUrl = validateWebhookUrl(parsed.data.url).toString()
    } catch (err) {
      return apiError('invalid_url', String(err), 400)
    }

    const secret = randomBytes(32).toString('hex')

    const { data, error } = await ctx.db
      .from('webhook_endpoints' as any)
      .insert({
        tenant_id: ctx.tenantId,
        url: validatedUrl,
        description: parsed.data.description || null,
        events: parsed.data.events,
        secret,
        is_active: parsed.data.is_active ?? true,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/webhooks] Create error:', error)
      return apiError('create_failed', 'Failed to create webhook subscription', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['webhooks:manage'] }
)
